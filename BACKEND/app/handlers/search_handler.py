from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_,or_
from app.database.models import File,Vector, Permission, Sharelink
from app.service.embedding import search_embeddings
from app.service.faiss_index import search_index

def search_by_filename_handler(
    file_name: str,
    user_id: int,
    db: Session
):
    file = (
        db.query(File)
        .filter(
            File.user_id == user_id,
            File.file_name == file_name
        )
        .first()
    )

    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )

    return file

THRESHOLD = 0.50


def semantic_search_handler(
    query: str,
    user_id: int,
    user_email: str,
    db: Session
):
    query_embedding = search_embeddings(query)

    distances, vector_ids = search_index(
        query_embedding,
        top_k=5
    )

    print("FAISS distance:", distances[0][0])

    vector_ids = vector_ids[0]
    distances = distances[0]

    if distances[0] > THRESHOLD:
        return []

    vector_rows = (
        db.query(Vector)
        .filter(
            Vector.vector_id.in_(vector_ids.tolist())
        )
        .all()
    )

    vector_to_file = {}

    for vector in vector_rows:
        vector_to_file[vector.vector_id] = vector.file_id

    file_ids = []

    for vector_id in vector_ids:
        file_id = vector_to_file.get(int(vector_id))

        if file_id is not None and file_id not in file_ids:
            file_ids.append(file_id)

    files = (
        db.query(File)
        .outerjoin(
            Sharelink,
            Sharelink.file_id == File.file_id
        )
        .outerjoin(
            Permission,
            Permission.share_id == Sharelink.share_id
        )
        .filter(
            File.file_id.in_(file_ids),
            File.is_indexed == True,
            File.deleted_at.is_(None),
            or_(
                File.user_id == user_id,
                and_(
                    Permission.email == user_email,
                    Sharelink.expires_at > datetime.now(timezone.utc)
                )
            )
        )
        .all()
    )

    file_map = {}

    for file in files:
        file_map[file.file_id] = file

    ordered_files = []

    for file_id in file_ids:
        if file_id in file_map:
            ordered_files.append(file_map[file_id])

    return ordered_files