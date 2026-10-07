from fastapi import APIRouter, Depends, HTTPException, status,Response,Cookie
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.database.models import RefreshToken, User
from app.security import create_access_token, create_refresh_tokens, get_current_user
import hashlib
from datetime import datetime, timedelta, timezone
from app.schema.auth_schema import ForgotPasswordRequest, LoginResponse, PasswordResetResponse, RegisterRequest, RegisterResponse, LoginRequest, ResetPasswordRequest,ProfileResponse,ProfileUpdate
from app.handlers.auth_handler import register_user,login_user,forgot_password_user,reset_password_user,validate_reset_token,get_profile_handler,update_profile_handler
from app.utils import utc_now

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED
)
def register(
    request: RegisterRequest,
    db: Session = Depends(get_db)
):

    new_user = register_user(request, db)

    return RegisterResponse(
        user_id=new_user.user_id,
        first_name=new_user.first_name,
        last_name=new_user.last_name,
        email=new_user.email,
        message="Registration successfull"
    )

@router.post(
    "/login",
    response_model=LoginResponse,
    status_code=status.HTTP_200_OK
)
def login(
    request: LoginRequest,
    response: Response,
    db: Session = Depends(get_db)
):

    result = login_user(request, db)

    existing_user = result["user"]
    access_token = result["access_token"]
    refresh_token = result["refresh_token"]

    # Set the refresh token as an HTTP-only cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False, 
        samesite="lax",
        max_age=7 * 24 * 60 * 60,
        path = "/auth"
    )

    return LoginResponse(
        user_id=existing_user.user_id,
        first_name=existing_user.first_name,
        last_name=existing_user.last_name,
        email=existing_user.email,
        access_token=access_token
    )

@router.post("/refresh")
def refresh(
    response: Response,
    refresh_token: str | None = Cookie(default=None),
    db: Session = Depends(get_db)
):

    try:

        if not refresh_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token missing"
            )

        token_hash = hashlib.sha256(
            refresh_token.encode()
        ).hexdigest()

        existing_token = (
            db.query(RefreshToken)
            .filter(
                RefreshToken.token_hash == token_hash
            )
            .with_for_update()
            .first()
        )

        if not existing_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )

        if existing_token.expires_at <= utc_now():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token expired"
            )

        user = (
            db.query(User)
            .filter(
                User.user_id == existing_token.user_id
            )
            .first()
        )

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        # Delete the old refresh token
        db.delete(existing_token)

        # Create a new refresh token
        new_refresh_token, new_token_hash = create_refresh_tokens()

        new_refresh = RefreshToken(
            user_id=user.user_id,
            token_hash=new_token_hash,
            expires_at=utc_now() + timedelta(days=7),
            created_at=utc_now()
        )

        db.add(new_refresh)

        # Create new access token
        new_access_token = create_access_token(
            user_id=user.user_id,
            email=user.email
        )

        # Commit delete + insert together
        db.commit()

        response.set_cookie(
            key="refresh_token",
            value=new_refresh_token,
            httponly=True,
            secure=False,
            samesite="lax",
            max_age=7 * 24 * 60 * 60,
            path="/auth"
        )

        return {
            "access_token": new_access_token
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to refresh token"
        )

@router.post("/logout")
def logout(
    response: Response,
    refresh_token: str | None = Cookie(default=None),
    db: Session = Depends(get_db)
):

    try:

        if not refresh_token:
            response.delete_cookie(
                key="refresh_token",
                path="/auth"
            )

            return {
                "message" : "Logged out successfully"
            }

        token_hash = hashlib.sha256(
            refresh_token.encode()
        ).hexdigest()

        existing_token = (
            db.query(RefreshToken)
            .filter(
                RefreshToken.token_hash == token_hash
            )
            .with_for_update()
            .first()
        )

        if existing_token:
            db.delete(existing_token)

            db.commit()

        response.delete_cookie(
            key="refresh_token",
            path="/auth"
        )

        return {
            "message" : "Logged out successfully"
        }

    except Exception:

        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to logout"
        )
    

@router.post(
    "/forgot-password",
    response_model=PasswordResetResponse,
    status_code=status.HTTP_200_OK
)
def forgot_password(
    request: ForgotPasswordRequest,
    db: Session = Depends(get_db)
):

    return forgot_password_user(request, db)

@router.post(
    "/reset-password",
    response_model=PasswordResetResponse,
    status_code=status.HTTP_200_OK
)
def reset_password(
    request: ResetPasswordRequest,
    db: Session = Depends(get_db)
):

    return reset_password_user(request, db)

@router.get("/reset-password/validate",response_model=PasswordResetResponse)
def validate_reset_password_token(token:str):

    return validate_reset_token(token)

@router.get(
    "/profile",
    response_model=ProfileResponse,
    status_code=status.HTTP_200_OK
)
def get_profile(
    current_user: User = Depends(get_current_user)
):

    return get_profile_handler(current_user)

@router.patch(
    "/profile",
    status_code=status.HTTP_200_OK
)
def update_profile(
    request: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    return update_profile_handler(
        request,
        current_user,
        db
    )