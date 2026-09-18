from datetime import datetime, timezone
from pathlib import Path
import numpy as np
from fastapi import UploadFile, BackgroundTasks,HTTPException,status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from magika import Magika
from app.database.models import File, Upload,Sharelink,Vector
from app.service.storage import save_file
from app.service.indexing import background_index_file
from app.service.faiss_index import remove_embeddings


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

    file_path = None

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

        # Save physical file using file_id
        file_path = save_file(
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

        if file_path is not None:
            path = Path(file_path)

            if path.exists():
                path.unlink()

        raise

    db.refresh(new_file)
    db.refresh(new_upload)

    background_tasks.add_task(
        background_index_file,
        file_path,
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

    file_path = (
        Path(__file__).resolve().parent.parent.parent
        / "storage"
        / f"user_{user_id}"
        / f"file_{file.file_id}"
    )

    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )

    media_type = file.file_type

    if not media_type:
        media_type = "application/octet-stream"

    return FileResponse(
        path=file_path,
        media_type=media_type
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

    file_path = (
        Path(__file__).resolve().parent.parent.parent
        / "storage"
        / f"user_{user_id}"
        / f"file_{file.file_id}"
    )

    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found in storage"
        )

    media_type = file.file_type

    if not media_type:
        media_type = "application/octet-stream"

    return FileResponse(
        path=file_path,
        media_type=media_type,
        filename=file.file_name
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

    path_to_file = (
        Path(__file__).resolve().parent.parent.parent
        / "storage"
        / f"user_{user_id}"
        / f"file_{file_id}"
    )

    try:
        if path_to_file.exists():
            path_to_file.unlink()
        else:
            raise FileNotFoundError("File does not exist in storage")

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