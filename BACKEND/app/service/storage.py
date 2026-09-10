from pathlib import Path
import shutil

BASE_DIR = Path(__file__).resolve().parent.parent.parent

STORAGE_DIR = BASE_DIR / "storage"


def save_file(user_id: int, file, file_id: int) -> str:
    user_storage_dir = STORAGE_DIR / f"user_{user_id}"

    user_storage_dir.mkdir(
        parents=True,
        exist_ok=True
    )

    file_path = user_storage_dir / f"file_{file_id}"

    try:

        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception:
        if file_path.exists():
            file_path.unlink()
        raise
    return str(file_path)