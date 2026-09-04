from pydantic import BaseModel, EmailStr, Field
from typing import List,Literal

class ShareRequest(BaseModel):
    emails:List[EmailStr]
    expires_in: int | None = Field(default=None, gt=0)
    expires_unit: Literal["minutes", "hours", "days", "years"] | None = None

