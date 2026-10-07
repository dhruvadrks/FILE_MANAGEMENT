import os
from datetime import datetime, timedelta, timezone
import jwt
from dotenv import load_dotenv
from pwdlib import PasswordHash
import secrets
import hmac
import hashlib
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.database.models import User


load_dotenv()

secret_key = os.getenv("secret_key")
password_pepper = os.getenv("PASSWORD_PEPPER")

ALGORITHM = "HS256"

access_token_expiration_minutes = 10

password_hash = PasswordHash.recommended()

def Pepper_Password(password:str):

    return hmac.new(
        password_pepper.encode(),
        password.encode(),
        hashlib.sha256
    ).hexdigest()

def hash_password(password: str):
    peppered_password = Pepper_Password(password)

    return password_hash.hash(peppered_password)


def verify_password(
    password: str,
    hashed_password: str
) -> bool:

    peppered_password = Pepper_Password(password)

    return password_hash.verify(
        peppered_password,
        hashed_password
    )


jwt_expander = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(jwt_expander),
    db: Session = Depends(get_db)
):
    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            secret_key,
            algorithms=[ALGORITHM]
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

    payload_user_id = payload.get("user_id")

    if not payload_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid token"
        )

    existing_user = (
        db.query(User)
        .filter(
            User.user_id == payload_user_id
        )
        .first()
    )

    if existing_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return existing_user


def create_refresh_tokens():

    token = secrets.token_urlsafe(64)

    token_hash = hashlib.sha256(
        token.encode()
    ).hexdigest()

    return token, token_hash

def create_access_token(
    user_id: int,
    email: str
) -> str:

    expire = (
        datetime.now(timezone.utc)
        + timedelta(
            minutes=access_token_expiration_minutes
        )
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