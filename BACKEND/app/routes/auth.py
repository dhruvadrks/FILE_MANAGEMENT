from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.database.models import User
from app.security import get_current_user
from app.schema.auth_schema import ForgotPasswordRequest, LoginResponse, PasswordResetResponse, RegisterRequest, RegisterResponse, LoginRequest, ResetPasswordRequest,ProfileResponse,ProfileUpdate
from app.handlers.auth_handler import register_user,login_user,forgot_password_user,reset_password_user,validate_reset_token,get_profile_handler,update_profile_handler


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
    db: Session = Depends(get_db)
):

    result = login_user(request, db)

    existing_user = result["user"]
    access_token = result["access_token"]

    return LoginResponse(
        user_id=existing_user.user_id,
        first_name=existing_user.first_name,
        last_name=existing_user.last_name,
        email=existing_user.email,
        access_token=access_token
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
