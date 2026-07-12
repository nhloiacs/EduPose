import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, ConfigDict
from app.core.responses import PaginationMeta 

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

class TeacherMetricsSummary(BaseModel):
    avg_focus_percentage: float
    avg_active_students: float
    avg_using_phone_count: float
    avg_raised_hand_count: float

class TeacherDetailResponse(TeacherRead):
    metrics_summary: TeacherMetricsSummary

class SessionMetricDetail(BaseModel):
    active_students: float
    focus_percentage: float
    using_phone_count: int
    raised_hand_count: int

class TeacherSessionRead(BaseModel):
    session_id: uuid.UUID
    classroom_name: Optional[str]
    subject: Optional[str]
    start_time: datetime
    end_time: Optional[datetime]
    status: str
    metrics: SessionMetricDetail

class PaginatedTeacherSessionResponse(BaseModel):
    items: List[TeacherSessionRead]
    meta: PaginationMeta
