from sqlalchemy.orm import Session
from pathlib import Path
import numpy as np
from app.models import File,Vector
from app.service.text_extraction import extract_text
from app.service.chunking import chunk_text
from app.service.embedding import generate_embeddings
from app.service.faiss_index import add_embeddings,save_index

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

    add_embeddings(
        embeddings,
        vector_ids
    )

    save_index()

    file=db.get(File,file_id)

    if file:
        file.is_indexed=True

    db.commit()

    return embeddings




