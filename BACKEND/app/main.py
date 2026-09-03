from fastapi import FastAPI

from app.database import Base, engine
from app import models
from app.routes.auth import router as auth_router
from app.routes.files import router as files_router
from app.routes.search import router as search_router
app = FastAPI()

Base.metadata.create_all(bind=engine)
app.include_router(auth_router)
app.include_router(files_router)
app.include_router(search_router)