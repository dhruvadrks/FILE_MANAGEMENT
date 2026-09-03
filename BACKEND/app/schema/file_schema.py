from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

class RenameRequest(BaseModel):
    new_file_name:str=Field(...)