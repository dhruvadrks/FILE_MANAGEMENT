from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase,sessionmaker


DATABASE_URL = "mysql+pymysql://root:root@localhost:3306/file_management"

engine = create_engine(DATABASE_URL)

class Base(DeclarativeBase):
    pass

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

