from pydantic import BaseModel
from typing import Optional, List
import uuid
from datetime import datetime
from app.core.responses import PaginationMeta

class ClassroomSessionUpdate(BaseModel):
    subject: Optional[str] = None

class ClassroomSessionEditRead(BaseModel):
    id: uuid.UUID
    subject: Optional[str]

class ClassroomSessionListRead(BaseModel):
    id: uuid.UUID
    classroom_name: Optional[str]
    teacher_name: Optional[str]
    subject: Optional[str]
    start_time: datetime
    end_time: Optional[datetime]
    status: str
    metrics_summary: SessionMetricSummary

class PaginatedClassroomSessionResponse(BaseModel):
    items: List[ClassroomSessionListRead]
    meta: PaginationMeta

class SessionMetricSummary(BaseModel):
    avg_focus_percentage: float
    avg_active_students: float
    total_using_phone: int
    total_raised_hand: int

class ClassroomSessionDetailRead(BaseModel):
    id: uuid.UUID
    classroom_id: Optional[uuid.UUID]
    classroom_name: Optional[str]
    teacher_id: Optional[uuid.UUID]
    teacher_name: Optional[str]
    subject: Optional[str]
    start_time: datetime
    end_time: Optional[datetime]
    status: str
    metrics_summary: SessionMetricSummary

class SessionStudentMetricRead(BaseModel):
    id: uuid.UUID
    student_id: Optional[uuid.UUID]
    student_name: Optional[str]
    student_nis: Optional[str]
    focus_score: float
    distracted_score: float
    raised_hand_count: int
    updated_at: datetime

class PaginatedSessionStudentMetricResponse(BaseModel):
    items: List[SessionStudentMetricRead]
    meta: PaginationMeta
