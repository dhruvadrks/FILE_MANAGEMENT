from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_,or_
from datetime import datetime, timezone
from app.database import get_db
from app.models import User,File,Vector,Permission,Sharelink
from app.security import get_current_user
from app.service.embedding import search_embeddings
from app.service.faiss_index import search_index

router=APIRouter(
    prefix="/search",
    tags=["Search files"]
)

@router.get("/name",status_code=status.HTTP_200_OK)
def search_by_filename(file_name:str,
                       current_user:User=Depends(get_current_user),
                       db:Session=Depends(get_db)
                       ):
    file=(
        db.query(File)
        .filter(File.user_id==current_user.user_id,
                File.file_name==file_name).first()
    )

    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    return file

THRESHOLD = 0.36

@router.get("/query", status_code=status.HTTP_200_OK)
def semantic_search(
    query: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query_embedding = search_embeddings(query)

    distances, vector_ids = search_index(
        query_embedding,
        top_k=5
    )

    print("FAISS distance:", distances[0][0])

    vector_ids = vector_ids[0]
    distances = distances[0]


    if distances[0]>THRESHOLD:
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
        vector_to_file[vector.vector_id]=vector.file_id

    
    file_ids=[]

    for vector_id in vector_ids:
        file_id=vector_to_file.get(int(vector_id))

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
                File.user_id == current_user.user_id,
                and_(
                    Permission.email == current_user.email,
                    Sharelink.expires_at>datetime.now(timezone.utc)
                )
            )
        )
        .all()
    )

    file_map={}

    for file in files:
        file_map[file.file_id]=file

    ordered_files=[]

    for file_id in file_ids:
        if file_id in file_map:
            ordered_files.append(file_map[file_id])

    return ordered_files