from sqlalchemy.orm import Session
from pathlib import Path
import numpy as np
from app.database.database import SessionLocal
from app.database.models import File,Vector
from app.service.text_extraction import extract_text
from app.service.chunking import chunk_text
from app.service.embedding import generate_embeddings
from app.service.faiss_index import add_embeddings_and_save,remove_embeddings

def index_file(
        file_path:Path,
        file_type:str,
        file_id:int,
        db:Session
):

    text=extract_text(file_path,file_type)

    chunks=chunk_text(text)

    if not chunks:
        return

    embeddings=generate_embeddings(chunks)

    vector_rows=[]
    faiss_added=False

    try:

        for embedding in embeddings:
            new_vector=Vector(
                file_id=file_id
            )

            db.add(new_vector)
            vector_rows.append(new_vector)
        db.flush()

        vector_ids=[]
        for vector in vector_rows:
            vector_ids.append(vector.vector_id)

        vector_ids=np.array(vector_ids,dtype="int64")

        add_embeddings_and_save(
            embeddings,
            vector_ids
        )

        faiss_added=True

        file=db.get(File,file_id)

        if not file:
            raise ValueError(f"file {file_id} not found")
        
        file.is_indexed=True

        db.commit()

        return embeddings

    except Exception:
        if vector_ids.size>0:
            remove_embeddings(
                vector_ids
            )
        db.rollback()

        raise

def background_index_file(
    file_path: Path,
    file_type: str,
    file_id: int
):
    db = SessionLocal()

    try:
        index_file(
            file_path=file_path,
            file_type=file_type,
            file_id=file_id,
            db=db
        )

    except Exception as e:
        print(f"indexing failed for file id = {file_id}:{e}")

    finally:
        db.close()
