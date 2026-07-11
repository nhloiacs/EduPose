import uuid
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from app.core.responses import PaginationMeta 
from datetime import datetime

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

class StudentMetricsSummary(BaseModel):
    avg_focus_score: float
    avg_distracted_score: float
    avg_raised_hand_count: float
    total_raised_hand_count: int

class StudentDetailResponse(BaseModel):
    id: uuid.UUID
    name: str
    nis: Optional[str]
    photo_filepath: Optional[str]
    classroom_id: Optional[uuid.UUID]
    classroom_name: Optional[str]
    metrics_summary: StudentMetricsSummary

class SessionMetricDetail(BaseModel):
    focus_score: float
    distracted_score: float
    raised_hand_count: int

class StudentSessionRead(BaseModel):
    session_id: uuid.UUID
    subject: Optional[str]
    start_time: datetime
    end_time: Optional[datetime]
    teacher_name: Optional[str]
    metrics: SessionMetricDetail

class PaginatedStudentSessionResponse(BaseModel):
    items: List[StudentSessionRead]
    meta: PaginationMeta 
