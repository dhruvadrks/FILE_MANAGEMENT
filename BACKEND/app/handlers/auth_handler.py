from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.database.models import User
from app.schema.auth_schema import RegisterRequest,LoginRequest,ForgotPasswordRequest,PasswordResetResponse,ResetPasswordRequest
from app.security import hash_password, verify_password, create_reset_token,create_access_token,verify_reset_token,hmac,secret_key
import hashlib

def register_user(request: RegisterRequest, db: Session):

    existing_user = (
        db.query(User)
        .filter(User.email == request.email)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered"
        )

    if request.password != request.confirm_password:
        raise HTTPException(
            status_code = status.HTTP_406_NOT_ACCEPTABLE,
            detail="Passwords do not match"
        )

    hashed_password = hash_password(request.password)

    new_user = User(
        first_name=request.first_name,
        last_name=request.last_name,
        email=request.email,
        password_hashed=hashed_password
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user

def login_user(request: LoginRequest, db: Session):

    existing_user = (
        db.query(User)
        .filter(User.email == request.email)
        .first()
    )

    if not existing_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found Register before Login"
        )

    if not verify_password(
        request.password,
        existing_user.password_hashed
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect Password"
        )

    access_token = create_access_token(
        user_id=existing_user.user_id,
        email=existing_user.email
    )

    return {
        "user": existing_user,
        "access_token": access_token
    }


def forgot_password_user(
    request: ForgotPasswordRequest,
    db: Session
):

    existing_user = (
        db.query(User)
        .filter(User.email == request.email)
        .first()
    )

    if not existing_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not registered"
        )

    token = create_reset_token(
        user_id=existing_user.user_id,
        email=existing_user.email,
        password_hashed=existing_user.password_hashed
    )

    reset_link = (
        f"http://localhost:4200/reset-password?token={token}"
    )

    print(
        f"Password reset link for "
        f"{existing_user.email}: {reset_link}"
    )

    return PasswordResetResponse(
        message="password reset link sent to registered email address"
    )


def reset_password_user(
    request: ResetPasswordRequest,
    db: Session
):

    if request.new_password != request.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match"
        )

    try:
        payload = verify_reset_token(request.token)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    token_user_id = payload.get("user_id")

    if token_user_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid token"
        )

    existing_user = (
        db.query(User)
        .filter(User.user_id == token_user_id)
        .first()
    )

    if not existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User not found"
        )

    token_email = payload.get("email")

    if token_email != existing_user.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email does not match token"
        )

    if existing_user.email != request.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email does not match user"
        )

    current_fingerprint = hmac.new(
        secret_key.encode(),
        existing_user.password_hashed.encode(),
        hashlib.sha256
    ).hexdigest()

    token_fingerprint = payload.get("password_fingerprint")

    if not hmac.compare_digest(
        current_fingerprint,
        token_fingerprint
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password has been changed since the token was issued"
        )

    new_password = hash_password(request.new_password)

    existing_user.password_hashed = new_password

    db.commit()

    return PasswordResetResponse(
        message="Password reset successful"
    )