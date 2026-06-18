import uuid
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from app.schemas.base import PaginationMeta 

class StudentBase(BaseModel):
    name: str
    nis: str
    classroom_id: uuid.UUID

class StudentCreate(StudentBase):
    pass

class StudentUpdate(BaseModel):
    name: Optional[str] = None
    nis: Optional[str] = None
    classroom_id: Optional[uuid.UUID] = None
    
    model_config = ConfigDict(from_attributes=True)

class StudentRead(StudentBase):
    id: uuid.UUID
    classroom_name: str 
    photo_filepath: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class PaginatedStudentResponse(BaseModel):
    items: List[StudentRead]
    meta: PaginationMeta