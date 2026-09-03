from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User,File 
from app.security import get_current_user
from app.database import get_db

router=APIRouter(
    prefix="/search",
    tags="Search files"
)

@router.get("/search")
def search_by_filename(file_name:str,
                       current_user:User=Depends(get_current_user),
                       db:Session=Depends(get_db)
                       ):
    file=(
        db.query(File)
        .filter(current_user.user_id==File.user_id,
                file_name==File.file_name).first()
    )

    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            details="File not found"
        )
    return file