from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.database.models import User
from app.security import get_current_user
from app.schema.sharing_schema import ShareRequest,ShareChange
from app.handlers.sharing_handler import (
    create_share_handler,
    access_share_handler,
    revoke_share_handler,
    get_all_shares_handler,
    change_share_setting_handler,
    sharelink_validate_handler
)

router = APIRouter(
    prefix="/share",
    tags=["Sharing"]
)

@router.post("/{file_id}", status_code=status.HTTP_201_CREATED)
def create_share(
    file_id: int,
    request: ShareRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return create_share_handler(
        file_id,
        request,
        current_user.user_id,
        db
    )

@router.get("/{token}", status_code=status.HTTP_200_OK)
def access(
    token: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return access_share_handler(
        token,
        current_user.email,
        db
    )

@router.delete("/{share_id}/revoke", status_code=status.HTTP_200_OK)
def revoke_sharing(
    share_id:int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return revoke_share_handler(
        share_id,
        current_user.user_id,
        db
    )

@router.get("", status_code=status.HTTP_200_OK)
def get_all_shares(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return get_all_shares_handler(
        current_user.user_id,
        db
    )

@router.patch("/{share_id}/change", status_code=status.HTTP_200_OK)
def change_share_setting(
    share_id:int,
    request:ShareChange,
    current_user:User = Depends(get_current_user),
    db:Session = Depends(get_db)
):
    return change_share_setting_handler(
        share_id,
        request,
        current_user.user_id,
        db
    )

@router.get("/sharelink/validate")
def sharelink_validate(
    token:str,
    db:Session = Depends(get_db)
):
    return sharelink_validate_handler(token,db)