import uuid
from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime
from app.core.responses import PaginationMeta

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

class ClassroomMetricsSummary(BaseModel):
    avg_focus_percentage: float
    avg_active_students: float
    avg_using_phone_count: float
    avg_raised_hand_count: float

class ClassroomDetailResponse(BaseModel):
    id: uuid.UUID
    name: str
    camera_id: Optional[uuid.UUID]
    metrics_summary: ClassroomMetricsSummary

class ClassroomSessionRead(BaseModel):
    session_id: uuid.UUID
    subject: Optional[str]
    start_time: datetime
    end_time: Optional[datetime]
    teacher_name: Optional[str]
    metrics: SessionMetric
    model_config = ConfigDict(from_attributes=True)

class PaginatedClassroomSessionResponse(BaseModel):
    items: List[ClassroomSessionRead]
    meta: dict

class SessionMetric(BaseModel):
    active_students: int
    focus_percentage: float
    using_phone_count: int
    raised_hand_count: int

class ClassroomStudentRead(BaseModel):
    id: uuid.UUID
    name: str
    nis: str
    photo_filepath: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class PaginatedClassroomStudentResponse(BaseModel):
    items: List[ClassroomStudentRead]
    meta: PaginationMeta

class ClassroomSelectRead(BaseModel):
    id: uuid.UUID   
    name: str
