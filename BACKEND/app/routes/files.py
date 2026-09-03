from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException,UploadFile, status
from pathlib import Path
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import File, Upload, User
from app.security import get_current_user
from app.service.storage import save_file
import mimetypes
from mimetypes import guess_type
from fastapi.responses import FileResponse
from app.schema.file_schema import RenameRequest

router = APIRouter(
    prefix="/files",
    tags=["Files"]
)

@router.post("/upload", status_code=status.HTTP_201_CREATED)
def get_Uploads(file: UploadFile,
                current_user: User = Depends(get_current_user),
                db: Session = Depends(get_db)):
    #get file size
    file.file.seek(0,2)
    file_size=file.file.tell()
    file.file.seek(0)

    file_type, _ = guess_type(file.filename)

    #create a new file record
    new_file=File(
        user_id=current_user.user_id,
        file_name=file.filename,
        file_size=file_size,
        file_type=file_type,
        is_indexed=False,
        is_favorite=False,
        updated_at=datetime.now(timezone.utc),
        folder_id=None)
    db.add(new_file)
    db.flush()

    file_path = save_file(
    user_id=current_user.user_id,
    file_id=new_file.file_id,
    file=file)

    #create a new upload record
    new_upload=Upload(
        user_id=current_user.user_id,
        file_id=new_file.file_id,
        upload_status="in_progress",
        uploaded_size=file_size
    )

    db.add(new_upload)
    db.commit()
    db.refresh(new_file)
    db.refresh(new_upload)

    return {
        "file_id": new_file.file_id,
        "upload_id": new_upload.upload_id,
        "file_name": new_file.file_name,
        "file_size": new_file.file_size,
        "is_indexed": new_file.is_indexed,
        "upload_status": new_upload.upload_status,
    }

@router.get("")
def get_files(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    files=(
        db.query(File)
        .filter(File.user_id==current_user.user_id)
        .all()
    )

    return files

@router.get("/{file_id}")
def get_file(file_id:int,
            current_user:User=Depends(get_current_user),
            db:Session=Depends(get_db)):
    file=(
        db.query(File)
        .filter(File.file_id==file_id,File.user_id==current_user.user_id)
        .first()
    )

    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    return file

@router.get("/{file_id}/view")
def view_file(file_id:int,
            current_user:User=Depends(get_current_user),
            db:Session=Depends(get_db)):

    file=(db.query(File)
          .filter(File.file_id==file_id,
                  File.user_id==current_user.user_id)
          .first()
    )

    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )

    file_path=(Path(__file__).resolve().parent.parent.parent
    / "storage"
    / f"user_{current_user.user_id}"
    / f"file_{file.file_id}")

    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )

    media_type, _ = mimetypes.guess_type(file.file_name)

    if media_type is None:
        media_type="application/octet-stream"

    return FileResponse(
        path=file_path,
        media_type=media_type,) 

@router.patch("/{file_id}/favorite")
def favorite_file(file_id:int,
                  current_user:User=Depends(get_current_user),
                  db:Session=Depends(get_db)):
    file=(db.query(File)
          .filter(File.file_id==file_id,
                  File.user_id==current_user.user_id)
                  .first())

    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )

    file.is_favorite=not file.is_favorite
    db.commit()
    db.refresh(file)

    return {
        "file_id": file.file_id,
        "file_name": file.file_name,
        "is_favorite": file.is_favorite
    }


@router.patch("/{file_id}/rename")
def rename(file_id:int,
           Request:RenameRequest,
           current_user:User=Depends(get_current_user),
           db:Session=Depends(get_db)):

    file=db.query(File).filter(File.file_id==file_id,File.user_id==current_user.user_id).first()

    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )

    file.file_name=Request.new_file_name

    db.commit()

    return {
        "message": "File renamed successfully"
    }

    

@router.delete("/{file_id}/delete")
def delete_file(file_id:int,
                current_user:User=Depends(get_current_user),
                db:Session=Depends(get_db)):
    
    file=(db.query(File)
          .filter(File.file_id==file_id,
                  File.user_id==current_user.user_id)
          .first())
    
    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    path_to_file=(Path(__file__).resolve().parent.parent.parent
    / "storage"
    / f"user_{current_user.user_id}"
    / f"file_{file_id}")

    if path_to_file.exists():
        path_to_file.unlink()

    db.query(Upload).filter(
    Upload.user_id == current_user.user_id,
    Upload.file_id == file.file_id
    ).delete()

    db.delete(file)
    db.commit()

    return {
        "message": "File deleted successfully"
    }


