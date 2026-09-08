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

