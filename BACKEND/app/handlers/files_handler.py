from datetime import datetime, timezone
import numpy as np
from fastapi import UploadFile, BackgroundTasks,HTTPException,status, Response
from sqlalchemy.orm import Session
from magika import Magika
from app.database.models import File, Upload,Sharelink,Vector
from app.service.s3_operations import *
from app.service.indexing import background_index_file
from app.service.faiss_index import remove_embeddings
from app.service.s3_client import s3,BUCKET_NAME


m = Magika()


def upload_file_handler(
    file: UploadFile,
    background_tasks: BackgroundTasks,
    user_id: int,
    db: Session
):
    # Get file size
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)

    # Detect actual file type from file contents
    result = m.identify_bytes(file.file.read())

    file.file.seek(0)

    file_type = result.output.mime_type

    # file_path = None
    s3_key = None

    try:
        # Create a new file record
        new_file = File(
            user_id=user_id,
            file_name=file.filename,
            file_size=file_size,
            file_type=file_type,
            is_indexed=False,
            is_favorite=False,
            updated_at=datetime.now(timezone.utc),
            folder_id=None
        )

        db.add(new_file)
        db.flush()

        s3_key = upload_to_s3(
            user_id=user_id,
            file_id=new_file.file_id,
            file=file
        )

        # Create upload record
        new_upload = Upload(
            user_id=user_id,
            file_id=new_file.file_id,
            upload_status="completed",
            uploaded_size=file_size
        )

        db.add(new_upload)

        db.commit()

    except Exception:
        db.rollback()

        if s3_key is not None:
            s3.delete_object(
                Bucket = BUCKET_NAME,
                Key = s3_key
            )
        raise


    db.refresh(new_file)
    db.refresh(new_upload)

    background_tasks.add_task(
        background_index_file,
        user_id,
        new_file.file_type,
        new_file.file_id
    )

    return {
        "file_id": new_file.file_id,
        "upload_id": new_upload.upload_id,
        "file_name": new_file.file_name,
        "file_size": new_file.file_size,
        "file_type": new_file.file_type,
        "is_indexed": new_file.is_indexed,
        "upload_status": new_upload.upload_status,
    }


def get_files_handler(
    user_id: int,
    db: Session
):
    files = (
        db.query(File)
        .filter(File.user_id == user_id)
        .all()
    )

    return files

def get_file_handler(
    file_id: int,
    user_id: int,
    db: Session
):
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

    return file

def view_file_handler(
    file_id: int,
    user_id: int,
    db: Session
):
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


    file_bytes = get_file_from_s3(
        user_id=user_id,
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
            "Content-Disposition": f'inline; filename="{file.file_name}"'
        }
    )

def download_file_handler(
    file_id: int,
    user_id: int,
    db: Session
):
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


    file_bytes = get_file_from_s3(
        user_id=user_id,
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
            "Content-Disposition": f'attachment; filename="{file.file_name}"'
        }
    )

def favorite_file_handler(
    file_id: int,
    user_id: int,
    db: Session
):
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

    file.is_favorite = not file.is_favorite

    db.commit()
    db.refresh(file)

    return {
        "file_id": file.file_id,
        "file_name": file.file_name,
        "is_favorite": file.is_favorite
    }

def rename_file_handler(
    file_id: int,
    new_file_name: str,
    user_id: int,
    db: Session
):
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

    file.file_name = new_file_name

    db.commit()

    return {
        "message": "File renamed successfully"
    }

def delete_file_handler(
    file_id: int,
    user_id: int,
    db: Session
):
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

    s3_key = f"user_{user_id}/file_{file_id}"
    

    try:
        s3.delete_object(
            Bucket=BUCKET_NAME,
            Key=s3_key
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"failed to delete file from storage: {str(e)}"
        )

    vector_rows = (
        db.query(Vector)
        .filter(Vector.file_id == file_id)
        .all()
    )

    vector_ids = []

    for vector in vector_rows:
        vector_ids.append(vector.vector_id)

    if vector_ids:
        vector_ids = np.array(
            vector_ids,
            dtype="int64"
        )

        try:
            remove_embeddings(vector_ids)

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"failed to remove embeddings from from FAISS: {str(e)}"
            )

    for vector in vector_rows:
        db.delete(vector)

    db.flush()

    db.query(Upload).filter(
        Upload.user_id == user_id,
        Upload.file_id == file.file_id
    ).delete(
        synchronize_session=False
    )

    db.flush()

    share_links = (
        db.query(Sharelink)
        .filter(Sharelink.file_id == file_id)
        .all()
    )

    for share_link in share_links:
        share_link.status = False

    db.flush()

    db.delete(file)

    db.commit()

    return {
        "message": "File deleted successfully"
    }