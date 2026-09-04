from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Sharelink,Permission,User,File
from app.security import get_current_user
from app.database import get_db
from app.schema.sharing_schema import ShareRequest
from datetime import datetime, timezone, timedelta
import hashlib
import secrets
from pathlib import Path

router = APIRouter(
    prefix="/share",
    tags=["Sharing"]
)

@router.post("/{file_id}",status_code=status.HTTP_201_CREATED)
def create_share(file_id,request:ShareRequest,
                 current_user:User=Depends(get_current_user),
                 db:Session=Depends(get_db)):

    file=(db.query(File)
          .filter(File.file_id==file_id,
                  File.user_id==current_user.user_id).first()
        )

    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )

    if request.expires_in is not None and request.expires_unit is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="expire unit is required"
        )
    
    if request.expires_in is None and request.expires_unit is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="expires in is required"

        )

    now=datetime.now(timezone.utc)

    if request.expires_in is None:
        expires_at= now + timedelta(days=3)

    elif request.expires_unit=="minutes":
        expires_at= now + timedelta(minutes=request.expires_in)
    
    elif request.expires_unit == "hours":
        expires_at = now + timedelta(
            hours=request.expires_in
        )

    elif request.expires_unit == "days":
        expires_at = now + timedelta(
            days=request.expires_in
        )

    elif request.expires_unit == "years":
        expires_at = now + timedelta(
            days=request.expires_in * 365
        )

    share_token=secrets.token_urlsafe(32)

    token_hash=hashlib.sha256(
        share_token.encode()
    ).hexdigest()

    new_share=Sharelink(
        file_id=file_id,
        token_hash=token_hash,
        created_at=now,
        expires_at=expires_at,
        status=True
    )

    db.add(new_share)
    db.flush()

    for email in request.emails:
        permission=Permission(share_id=new_share.share_id,
        email=str(email))

    db.add(permission)
    db.commit()

    share_link=f"http://localhost:8000/share/{share_token}"

    return{
        "share_id":new_share.share_id,
        "file_id":file_id,
        "expires_at":expires_at,
        "share_link":share_link
    }

@router.get("/{token}", status_code=status.HTTP_200_OK)
def access(
    token: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    # Hash the received share token
    token_hash = hashlib.sha256(
        token.encode()
    ).hexdigest()

    # Find the share link
    share_token = (
        db.query(Sharelink)
        .filter(Sharelink.token_hash == token_hash)
        .first()
    )

    # Token does not exist
    if not share_token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid share token"
        )

    # Share was revoked/inactivated
    if not share_token.status:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Share link is no longer active"
        )

    # Current time
    now = datetime.now(timezone.utc)

    # Database may return a naive datetime
    expires_at = share_token.expires_at

    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    # Share has expired
    if expires_at <= now:

        share_token.status = False
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Share link expired"
        )

    # Check whether the Receiver has permission
    permission = (
        db.query(Permission)
        .filter(
            Permission.share_id == share_token.share_id,
            Permission.email == current_user.email
        )
        .first()
    )

    # Receiver is not authorized
    if not permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No access"
        )

    # Find the shared file
    file = (
        db.query(File)
        .filter(
            File.file_id == share_token.file_id
        )
        .first()
    )

    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )

    # Physical file path
    file_path = (
        Path(__file__).resolve().parent.parent.parent
        / "storage"
        / f"user_{file.user_id}"
        / f"file_{file.file_id}"
    )

    # Physical file does not exist
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )

    # Return the shared file
    return FileResponse(
        path=file_path,
        media_type=file.file_type,
        filename=file.file_name
    )

@router.delete("/{token}/revoke",status_code=status.HTTP_200_OK)
def revoke_sharing(token,
                   current_user:User=Depends(get_current_user),
                   db:Session=Depends(get_db)):
    token_hash=hashlib.sha256(
        token.encode()
    ).hexdigest()

    share_link=(
        db.query(Sharelink)
        .join(File,
              File.file_id==Sharelink.file_id)
              .filter(File.user_id==current_user.user_id,
                      Sharelink.token_hash==token_hash)
                      .first()
    )

    if not share_link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Share link does not exist"
        )

    if not share_link.status:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Sharelink has is already inactive"
        )

    share_link.status=False

    db.commit()
    return{
        "message":"Share link revoked successfully"
    }

@router.get("", status_code=status.HTTP_200_OK)
def get_all_shares(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    now = datetime.now(timezone.utc)

    share_links = (
        db.query(Sharelink)
        .join(
            File,
            File.file_id == Sharelink.file_id
        )
        .filter(
            File.user_id == current_user.user_id,
            Sharelink.status == True,
            Sharelink.expires_at > now
        )
        .all()
    )

    result = []

    for share_link in share_links:

        permissions = (
            db.query(Permission)
            .filter(
                Permission.share_id == share_link.share_id
            )
            .all()
        )

        file = (
            db.query(File)
            .filter(
                File.file_id == share_link.file_id
            )
            .first()
        )

        result.append({
            "share_id": share_link.share_id,
            "file_id": share_link.file_id,
            "file_name": file.file_name,
            "emails": [
                permission.email
                for permission in permissions
            ],
            "created_at": share_link.created_at,
            "expires_at": share_link.expires_at,
            "status": share_link.status
        })

    return result

        
    

    

                 
                          

    
        
    