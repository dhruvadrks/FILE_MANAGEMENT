from sqlalchemy.orm import Session
from app.models import Chunk,Vector
from pathlib import Path
from app.service.text_extraction import extract_text
from app.service.chunking import chunk_text
from app.service.embedding import generate_embeddings

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

    for index, chunk in enumerate(chunks):
        new_chunk=Chunk(
            file_id=file_id,
            chunk_index=index
        )

        db.add(new_chunk)
        db.flush()

        new_vector=Vector(
            chunk_id=new_chunk.chunk_id
        )
        db.add(new_vector)
        db.flush()

    db.commit()
    return embeddings


