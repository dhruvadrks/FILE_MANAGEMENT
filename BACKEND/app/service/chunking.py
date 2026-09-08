from app.service.model import tokenizer

def chunk_text(
        text:str,
        max_tokens: int = 450,
        token_overlap:int=50,
)->list[str]:

    if not text.strip():
        return []

    if token_overlap >= max_tokens:
        raise ValueError("token overlap cannot be more than max tokens")

    tokens=tokenizer.encode(
        text,add_special_tokens=False
    )

    chunks = []

    start = 0

    while start < len(tokens):
        end = start + max_tokens

        chunk_tokens=tokens[start:end]

        chunk=tokenizer.decode(
            chunk_tokens,
            skip_special_tokens=True
        ).strip()

        if chunk:
            chunks.append(chunk)

        start += max_tokens-token_overlap
    return chunks





    
    