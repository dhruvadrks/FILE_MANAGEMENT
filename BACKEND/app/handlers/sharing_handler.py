from datetime import datetime, timezone, timedelta
import secrets
from fastapi import HTTPException, status, Response
from sqlalchemy.orm import Session
from app.service.utils import utc_now
from app.database.models import Sharelink, Permission, File, User
from app.schema.sharing_schema import ShareRequest, ShareChange
from app.service.s3_operations import get_file_from_s3


def create_share_handler(
    file_id: int,
    request: ShareRequest,
    user_id: int,
    db: Session
):

    owner = (
        db.query(User)
        .filter(
            User.user_id == user_id
        )
        .first()
    )

    file = (
        db.query(File)
        .filter(
            File.file_id == file_id,
            File.user_id == user_id
        )
        .first()
    )

    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )

    # Get current time once
    now = datetime.now(timezone.utc)

    # Check if a share link already exists
    existing_share = (
        db.query(Sharelink)
        .filter(
            Sharelink.file_id == file_id,
            Sharelink.status == True
        )
        .first()
    )

    if existing_share:

        expires_at = existing_share.expires_at

        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(
                tzinfo=timezone.utc
            )

        # Existing link has expired
        if expires_at <= now:

            existing_share.status = False

            db.commit()

        # Existing link is still active
        else:

            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Share link already exists"
            )

    # Calculate expiry for the new share link
    if request.expires_at is None:

        expires_at = now + timedelta(days=3)

    else:

        expires_at = request.expires_at

        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(
                tzinfo=timezone.utc
            )

        if expires_at <= now:

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Expiry time must be in future"
            )

    # Generate a new secure token
    share_token = secrets.token_urlsafe(32)

    new_share = Sharelink(
        file_id=file_id,
        token=share_token,
        created_at=now,
        expires_at=expires_at,
        status=True
    )

    db.add(new_share)

    db.flush()

    # Add permissions
    for email in request.emails:

        if str(email) != owner.email:

            permission = Permission(
                share_id=new_share.share_id,
                email=str(email)
            )

            db.add(permission)

    db.commit()

    share_link = (
        f"http://localhost:4200/share/{share_token}"
    )

    return {
        "share_id": new_share.share_id,
        "file_id": file_id,
        "expires_at": expires_at,
        "share_link": share_link
    }


def access_share_handler(
    token: str,
    user_email: str,
    db: Session
):

    share_token = (
        db.query(Sharelink)
        .filter(
            Sharelink.token == token
        )
        .first()
    )

    if not share_token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid share token"
        )

    if not share_token.status:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Share link is no longer active"
        )

    now = datetime.now(timezone.utc)

    expires_at = share_token.expires_at

    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(
            tzinfo=timezone.utc
        )

    if expires_at <= now:

        share_token.status = False
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Share link expired"
        )

    owner = (
        db.query(User.email)
        .join(
            File,
            File.user_id == User.user_id
        )
        .join(
            Sharelink,
            Sharelink.file_id == File.file_id
        )
        .filter(
            Sharelink.token == token
        )
        .first()
    )

    if owner and owner.email == user_email:
        pass

    else:

        permission = (
            db.query(Permission)
            .filter(
                Permission.share_id == share_token.share_id,
                Permission.email == user_email
            )
            .first()
        )

        if not permission:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No access"
            )

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

    # Get the file from S3
    file_bytes = get_file_from_s3(
        user_id=file.user_id,
        file_id=file.file_id
    )

    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found in storage"
        )

    media_type = file.file_type

    if not media_type:
        media_type = "application/octet-stream"

    return Response(
        content=file_bytes,
        media_type=media_type,
        headers={
            "Content-Disposition": (
                f'inline; filename="{file.file_name}"'
            )
        }
    )


def revoke_share_handler(
    share_id: int,
    user_id: int,
    db: Session
):

    share_link = (
        db.query(Sharelink)
        .join(
            File,
            Sharelink.file_id == File.file_id
        )
        .filter(
            File.user_id == user_id,
            Sharelink.share_id == share_id
        )
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
            detail="Sharelink is already inactive"
        )

    share_link.status = False

    db.commit()

    return {
        "message": "Share link revoked successfully"
    }


def get_all_shares_handler(
    user_id: int,
    db: Session
):

    now = datetime.now(timezone.utc)

    owner = (
        db.query(User)
        .filter(
            User.user_id == user_id
        )
        .first()
    )

    share_links = (
        db.query(Sharelink)
        .join(
            File,
            File.file_id == Sharelink.file_id
        )
        .filter(
            File.user_id == user_id,
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
            "owner_email": owner.email,
            "emails": [
                permission.email
                for permission in permissions
            ],
            "file_type":file.file_type,
            "created_at": share_link.created_at,
            "share_token": share_link.token,
            "expires_at": share_link.expires_at,
            "status": share_link.status
        })

    return result


def change_share_setting_handler(
    share_id: int,
    request: ShareChange,
    user_id: int,
    db: Session
):

    share_link = (
        db.query(Sharelink)
        .join(
            File,
            Sharelink.file_id == File.file_id
        )
        .filter(
            Sharelink.share_id == share_id,
            File.user_id == user_id
        )
        .first()
    )

    now = datetime.now(timezone.utc)

    if not share_link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sharelink not found"
        )

    expires_at = share_link.expires_at

    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(
            tzinfo=timezone.utc
        )

    if expires_at <= now:

        share_link.status = False
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Share Link has expired"
        )

    if not share_link.status:

        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Share link Invalid or expired"
        )

    if request.expires_at is not None:

        expires_at = request.expires_at

        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(
                tzinfo=timezone.utc
            )

        if expires_at <= now:

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Expiry time must be in the future"
            )

        share_link.expires_at = expires_at

    permissions = (
        db.query(Permission)
        .filter(
            Permission.share_id == share_id
        )
        .all()
    )

    existing_emails = {
        permission.email
        for permission in permissions
    }

    new_emails = {
        str(email)
        for email in request.emails
    }

    emails_to_delete = (
        existing_emails - new_emails
    )

    emails_to_add = (
        new_emails - existing_emails
    )

    for permission in permissions:

        if permission.email in emails_to_delete:

            db.delete(permission)

    for email in emails_to_add:

        permission = Permission(
            share_id=share_id,
            email=email
        )

        db.add(permission)

    try:

        db.commit()

    except Exception:

        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update share settings"
        )

    return {
        "message": "Share settings updated successfully",
        "share_id": share_id,
        "expires_at": share_link.expires_at
    }


def sharelink_validate_handler(
    token: str,
    db: Session
):

    existing_token = (
        db.query(Sharelink)
        .filter(
            Sharelink.token == token
        )
        .first()
    )

    now = utc_now()

    if not existing_token:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Share Link"
        )

    expires_at = existing_token.expires_at

    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(
            tzinfo=timezone.utc
        )

    if expires_at <= now:

        existing_token.status = False
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Sharelink has expired"
        )

    if existing_token.status == False:

        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Sharelink is no longer active"
        )

    return {
        "message": "Sharelink is valid"
    }