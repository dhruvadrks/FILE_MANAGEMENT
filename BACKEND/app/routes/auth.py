import hashlib
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.schema.auth_schema import ForgotPasswordRequest, LoginResponse, PasswordResetResponse, RegisterRequest, RegisterResponse, LoginRequest, ResetPasswordRequest
from app.security import hash_password,verify_password,create_reset_token,create_access_token,verify_reset_token,hmac,secret_key
from app.security import get_current_user


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "user_id": current_user.user_id,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "email": current_user.email
    }

@router.post("/register",response_model=RegisterResponse,status_code=status.HTTP_201_CREATED)
def register(request: RegisterRequest, db: Session = Depends(get_db)):

    #check if the new user email already exist in db
    existing_user=(db.query(User)
    .filter(User.email==request.email)
    .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered"
        )

    #hash the password
    hashed_password=hash_password(request.password)

    #create new user
    new_user=User(
        first_name=request.first_name,
        last_name=request.last_name,
        email=request.email,
        password_hashed=hashed_password
    )

    #add the new user to the database
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    #return the response
    return RegisterResponse(
        user_id=new_user.user_id,
        first_name=new_user.first_name,
        last_name=new_user.last_name,
        email=new_user.email
    )

@router.post("/login",response_model=LoginResponse,status_code=status.HTTP_200_OK)
def login(request: LoginRequest, db: Session = Depends(get_db)):

    #check if user exist
    existing_user=(db.query(User)
          .filter(User.email==request.email)
          .first()
          )
    if not existing_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found Register before Login"
        )

    #check if password is correct
    if not verify_password(request.password,existing_user.password_hashed):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect Password"
        )

    #jwt access token creation
    access_token=create_access_token(
        user_id=existing_user.user_id,
        email=existing_user.email
    )

    return LoginResponse(
        user_id=existing_user.user_id,
        first_name=existing_user.first_name,
        last_name=existing_user.last_name,
        email=existing_user.email,
        access_token=access_token
    )


@router.post("/forgot-password",
            response_model=PasswordResetResponse,
            status_code=status.HTTP_200_OK)

def forgot_password(request: ForgotPasswordRequest,
                    db:Session=Depends(get_db)):

    #check if user exist
    existing_user=(db.query(User)
                   .filter(User.email==request.email).first()
    )

    if not existing_user:
        return PasswordResetResponse(
            message="User not registered ")
    
    token=create_reset_token(
        user_id=existing_user.user_id,
        email=existing_user.email,
        password_hashed=existing_user.password_hashed
    )

    #the link sent to user mail id
    reset_link = (
        f"http://localhost:3000/reset-password?token={token}"
    )

    print(f"Password reset link for {existing_user.email}: {reset_link}")

    return PasswordResetResponse(
        message="password reset link sent to registered email address"
    )

@router.post("/reset-password",
            response_model=PasswordResetResponse,
            status_code=status.HTTP_200_OK)

def reset_password(request: ResetPasswordRequest,
                   db: Session = Depends(get_db)
            ):
    #check if password match
    if request.new_password != request.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match"
        )

    #verify jwt
    try:
        payload=verify_reset_token(request.token)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    token_user_id=payload.get("user_id")

    if token_user_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid token"
        )

    existing_user=(db.query(User)
                   .filter(User.user_id==token_user_id).first())

    if not existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User not found"
        )

    token_email=payload.get("email")
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

    # 5. Check password fingerprint
    current_fingerprint = hmac.new(
    secret_key.encode(),
    existing_user.password_hashed.encode(),
    hashlib.sha256
    ).hexdigest()

    token_fingerprint=payload.get("password_fingerprint")

    if not hmac.compare_digest(current_fingerprint,token_fingerprint):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password has been changed since the token was issued"
        )

    #hash the new password
    new_password=hash_password(request.new_password)

    #update the password in the database
    existing_user.password_hashed=new_password
    db.commit()

    return PasswordResetResponse(
        message="Password reset successful")
