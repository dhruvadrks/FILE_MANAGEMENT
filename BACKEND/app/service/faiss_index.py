import faiss
import numpy as np

embedding_dimension=384

base_index=faiss.IndexFlatL2(embedding_dimension)

index=faiss.IndexIDMap2(base_index)

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