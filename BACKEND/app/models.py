from sqlalchemy import String, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime
from sqlalchemy import DateTime
from app.database import Base


class User(Base):
    __tablename__="users"

    user_id:Mapped[int]=mapped_column(
        primary_key=True,
        autoincrement=True
    )
    first_name:Mapped[str]=mapped_column(
        String(100)
    )
    last_name:Mapped[str] = mapped_column(
        String(100)
    )
    email:Mapped[str]=mapped_column(
        String(100)
    )
    password_hashed:Mapped[str]=mapped_column(
        String(100)
    )
    is_active:Mapped[bool]=mapped_column(
        Boolean,
        default=True
    )

class Upload(Base):
    __tablename__ = "uploads"

    upload_id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True
        )
    user_id:Mapped[int]=mapped_column(
        ForeignKey("users.user_id") 
    )
    file_id:Mapped[int]=mapped_column(
        ForeignKey("files.file_id")
    )
    upload_status: Mapped[str] = mapped_column(
        String(50)
        )
    uploaded_size: Mapped[int]

class File(Base):
    __tablename__ = "files"

    file_id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True
        )
    user_id:Mapped[int] = mapped_column(
        ForeignKey("users.user_id")
        )
    
    file_name: Mapped[str] = mapped_column(
        String(255)
        )
    file_size: Mapped[int]

    file_type: Mapped[str] = mapped_column(
        String(50)
        )


    is_favorite: Mapped[bool] = mapped_column(
        Boolean,
        default=False)

    is_indexed: Mapped[bool] = mapped_column(
        Boolean,
        default=False
    )

    updated_at:Mapped[datetime]=mapped_column(
        DateTime
    )

    deleted_at:Mapped[datetime | None]=mapped_column(
        DateTime,
        nullable=True
    )

    folder_id:Mapped[int]=mapped_column(
        ForeignKey("folder.folder_id"),
        nullable=True
    )

class Vector(Base):
    __tablename__="vector"

    vector_id:Mapped[int]=mapped_column(
        primary_key=True
    )

    file_id:Mapped[int]=mapped_column(
        ForeignKey("files.file_id")
    ) 

class Sharelink(Base):
    __tablename__="sharelink"

    share_id:Mapped[int]=mapped_column(
        primary_key=True,
        autoincrement=True
    )

    file_id:Mapped[int]=mapped_column(
        ForeignKey("files.file_id")
    )

    token_hash:Mapped[str]=mapped_column(
        String(128)
    )

    created_at:Mapped[datetime]=mapped_column(
        DateTime
    )

    expires_at:Mapped[datetime]=mapped_column(
        DateTime
    )

    status:Mapped[bool]=mapped_column(
        Boolean
    )

class Accessrequest(Base):
    __tablename__="accessrequest"

    request_id:Mapped[int]=mapped_column(
        primary_key=True,
        autoincrement=True
    )

    Share_id:Mapped[int]=mapped_column(
       ForeignKey("sharelink.share_id") 
    )

    file_id:Mapped[int]=mapped_column(
        ForeignKey("files.file_id")
    )

    Email:Mapped[str]=mapped_column(
        String(255)
    )

    Requested_at:Mapped[datetime]=mapped_column(
        DateTime
    )

    granted_at:Mapped[datetime]=mapped_column(
        DateTime
    )

    revoked_at:Mapped[datetime]=mapped_column(
        DateTime
    )

class Folder(Base):
    __tablename__="folder"

    folder_id:Mapped[int]=mapped_column(
        primary_key=True,
        autoincrement=True
    )

    parent_folder_id:Mapped[int | None]=mapped_column(
        ForeignKey("folder.folder_id"),
        nullable=True
    )

    updated_at:Mapped[datetime]=mapped_column(
        DateTime
    )