from pwdlib import PasswordHash
import hashlib
import hmac
import jwt
from datetime import datetime, timedelta,timezone
from fastapi import Depends,HTTPException,status
from sqlalchemy.orm import Session
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.database import get_db
from app.models import User

jwt_expander=HTTPBearer()

def get_current_user(
        credentials: HTTPAuthorizationCredentials = Depends(jwt_expander),
        db:Session=Depends(get_db)
):
    token=credentials.credentials
    try:
        payload=jwt.decode(
            token,secret_key,
            algorithms=ALGORITHM
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

    payload_user_id=payload.get("user_id")
    if not payload_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid token"
        )

    existing_user_id=db.query(User).filter(User.user_id==payload_user_id).first()
    if existing_user_id is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return existing_user_id


password_hash=PasswordHash.recommended()

def hash_password(password:str):
    return password_hash.hash(password)

def verify_password(password: str, hashed_password: str) -> bool:
    return password_hash.verify(password, hashed_password)

secret_key = "file_management_vector_vault_secret_key"
ALGORITHM = "HS256"
reset_token_expiration_minutes = 5
access_token_expiration_minutes = 30

def create_access_token(user_id: int, email: str) -> str:

    expire = datetime.now(timezone.utc) + timedelta(
        minutes=access_token_expiration_minutes
    )

    payload = {
        "user_id": user_id,
        "email": email,
        "exp": expire
    }

    token = jwt.encode(
        payload,
        secret_key,
        algorithm=ALGORITHM
    )

    return token

def create_reset_token(user_id:int,email:str,password_hashed:str)->str:

    #create a fingerprint of of current passsword hash
    password_fingerprint=hmac.new(secret_key.encode(), 
                        password_hashed.encode(), 
                        hashlib.sha256
                        ).hexdigest()


    expire=datetime.now(timezone.utc)+timedelta(
        minutes=reset_token_expiration_minutes)

    payload={
        "user_id": user_id,
        "email": email,
        "password_fingerprint": password_fingerprint,
        "exp": expire
    }

    token=jwt.encode(payload,secret_key,algorithm=ALGORITHM)

    return token

def verify_reset_token(token:str)->dict:
    try:
        payload=jwt.decode(
            token,
            secret_key,
            algorithms=[ALGORITHM]
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )


