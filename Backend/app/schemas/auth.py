from pydantic import BaseModel
from pydantic import EmailStr

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    token: str
    name: str
    email: str
    role: str
    photo_filepath: str