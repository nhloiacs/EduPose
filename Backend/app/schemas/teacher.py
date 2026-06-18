import uuid
from typing import Optional, List
from pydantic import BaseModel, EmailStr, ConfigDict
from app.schemas.base import PaginationMeta 

class TeacherBase(BaseModel):
    name: str
    nip: str
    email: EmailStr
    role: str

class TeacherCreate(TeacherBase):
    password: str

class TeacherUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    nip: Optional[str] = None 
    model_config = ConfigDict(from_attributes=True)

class TeacherRead(TeacherBase):
    id: uuid.UUID
    is_active: bool
    photo_filepath: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class PaginatedTeacherResponse(BaseModel):
    items: List[TeacherRead]
    meta: PaginationMeta

