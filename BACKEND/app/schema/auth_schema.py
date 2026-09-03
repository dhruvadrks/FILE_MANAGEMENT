from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

class RegisterRequest(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)
    email: EmailStr = Field(...)
    password: str = Field(..., min_length=8, max_length=100)
    confirm_password: str = Field(..., min_length=8, max_length=100)

    @model_validator(mode="after")
    def check_passwords_match(self):
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self

class RegisterResponse(BaseModel):
    user_id: int
    first_name: str
    last_name: str
    email: EmailStr

class LoginResponse(BaseModel):
    user_id: int
    first_name: str
    last_name: str
    email: EmailStr
    access_token: str

class LoginRequest(BaseModel):
    
    email: EmailStr = Field(...)
    password: str = Field(..., min_length=8, max_length=100)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    email: EmailStr

    new_password: str = Field(
        ...,
        min_length=8,
        max_length=100
    )

    confirm_password: str = Field(
        ...,
        min_length=8,
        max_length=100
    )


class PasswordResetResponse(BaseModel):
    message: str