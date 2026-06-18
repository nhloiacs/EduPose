import uuid
from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime
from app.schemas.base import PaginationMeta

class ClassroomBase(BaseModel):
    name: str

class ClassroomCreate(ClassroomBase):
    pass

class ClassroomUpdate(BaseModel):
    name: Optional[str] = None
    camera_id: Optional[uuid.UUID] = None

class ClassroomRead(ClassroomBase):
    id: uuid.UUID
    camera_id: Optional[uuid.UUID]
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class PaginatedClassroomResponse(BaseModel):
    items: List[ClassroomRead]
    meta: PaginationMeta