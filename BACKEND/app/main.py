from fastapi import FastAPI
from app.database.database import Base, engine
from app.database import models
from contextlib import asynccontextmanager
from app.service.faiss_index import load_index
from app.routes.auth import router as auth_router
from app.routes.files import router as files_router
from app.routes.search import router as search_router
from app.routes.sharing import router as share_router

@asynccontextmanager
async def lifespan(app:FastAPI):
    load_index()
    yield

app = FastAPI(lifespan=lifespan)

Base.metadata.create_all(bind=engine)
app.include_router(auth_router)
app.include_router(files_router)
app.include_router(search_router)
app.include_router(share_router)