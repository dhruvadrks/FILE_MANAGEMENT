from pydantic import BaseModel, EmailStr, Field
from typing import List
from datetime import datetime

class ShareRequest(BaseModel):
    emails:List[EmailStr]
    expires_at:datetime | None = None

class ShareChange(BaseModel):
    emails:List[EmailStr]
    expires_at:datetime | None = None
