from app.service.model import model
import numpy as np



def generate_embeddings(
        chunks:list[str],
) -> np.ndarray:

    if not chunks:
        return np.empty((0,384), dtype="float32")
    
    passages=[]

    for chunk in chunks:
        passages.append(f"passage: {chunk}")

    embeddings =model.encode(
        passages,
        convert_to_numpy=True
    )

    return embeddings.astype("float32")

def search_embeddings(search_query:str)->np.ndarray:
    search_query=f"query: {search_query}"

    search_query_embeddings = model.encode(
        [search_query],
        convert_to_numpy=True
    )

    return search_query_embeddings.astype("float32")

