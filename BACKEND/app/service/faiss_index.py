import faiss
import numpy as np
from pathlib import Path

embedding_dimension=384

base_index=faiss.IndexFlatL2(embedding_dimension)

index=faiss.IndexIDMap2(base_index)

FAISS_index_path= Path("storage/faiss/index.faiss")

def add_embeddings(
        embeddings:np.ndarray,
        vector_ids:np.ndarray
)->None:

    if embeddings.size==0:
        return

    embeddings=embeddings.astype("float32")
    vector_ids=vector_ids.astype("int64")

    index.add_with_ids(
        embeddings,
        vector_ids
    )

def save_index()->None:
    FAISS_index_path.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    faiss.write_index(
        index,str(FAISS_index_path)
    )

def load_index()->None:
    global index

    if FAISS_index_path.exists():
        index=faiss.read_index(
            str(FAISS_index_path)
        )

def search_index(
        query_embedding:np.ndarray,
        top_k:int=5
):

    # query_embedding=query_embedding.astype("float32")

    distances,vector_ids=index.search(
        query_embedding,
        top_k
    )

    return distances,vector_ids