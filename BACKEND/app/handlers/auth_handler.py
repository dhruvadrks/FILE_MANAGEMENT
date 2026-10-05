from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
import secrets
from app.database.redis_client import redis_client
from app.database.models import User
from app.schema.auth_schema import RegisterRequest,LoginRequest,ForgotPasswordRequest,PasswordResetResponse,ResetPasswordRequest,ProfileUpdate
from app.security import hash_password, verify_password,create_access_token


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
        return PasswordResetResponse(
            message = "Email not registered"
        )

    token = secrets.token_urlsafe(16)

    user_id = existing_user.user_id

    user_key = f"reset:user:{user_id}"
    token_key = f"reset:{token}"

    old_token = redis_client.get(user_key)

    if old_token:
        redis_client.delete(f"reset:{old_token}")

    redis_client.set(
        user_key,
        token,
        ex = 300
    )

    redis_client.set(
        token_key,user_id,
        ex = 300
    )

    reset_link = f"http://localhost:4200/reset-password?token={token}"

    print(reset_link)

    return PasswordResetResponse(
        message=reset_link
    )
    
def reset_password_user(
    request: ResetPasswordRequest,
    db: Session
):

    user_id = redis_client.get(
        f"reset:{request.token}"
    )

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reset Link expired"
        )

    user_id = int(user_id)

    user = (
        db.query(User)
        .filter(User.user_id == user_id)
        .with_for_update()
        .first()
    )
    if not user:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    token_user_id = redis_client.get(
        f"reset:{request.token}"
    )

    if not token_user_id:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Reset link expired or already used"
        )

    if int(token_user_id) != user_id:
        db.rollback()
        raise HTTPException (
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized"
        ) 
    new_hash_password = hash_password(
        request.new_password
    )

    user.password_hashed = new_hash_password

    redis_client.delete(
        f"reset:{request.token}"
    )
    redis_client.delete(
        f"reset:user:{user_id}"
    )

    db.commit()

    return PasswordResetResponse(
        message="Password changed successfully"
    )

def validate_reset_token(token:str):

    user_id = redis_client.get(
        f"reset:{token}"
    )

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reset link is invalid or expired"
        )

    return PasswordResetResponse(
        message="Reset link is valid"
    )

def get_profile_handler(
    current_user
):

    return {
        "first_name":current_user.first_name,
        "last_name":current_user.last_name,
        "email":current_user.email
    }

def update_profile_handler(
    request: ProfileUpdate,
    current_user: User,
    db: Session
):

    if request.first_name is not None:
        current_user.first_name = request.first_name

    if request.last_name is not None:
        current_user.last_name = request.last_name

    if request.email is not None:
        current_user.email = request.email

    db.commit()

    return {
        "message": "Profile updated successfully"
    }