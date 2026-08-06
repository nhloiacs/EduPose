from pydantic import BaseModel, ConfigDict
from typing import Optional, List
import uuid
from datetime import datetime
from app.core.responses import PaginationMeta


class ClassroomSessionCreate(BaseModel):
    classroom_id: uuid.UUID
    camera_id: uuid.UUID
    subject: Optional[str] = None


class ClassroomSessionUpdate(BaseModel):
    subject: Optional[str] = None
    camera_id: Optional[uuid.UUID] = None


class ClassroomSessionEditRead(BaseModel):
    id: uuid.UUID
    subject: Optional[str]
    camera_id: Optional[uuid.UUID] = None
    model_config = ConfigDict(from_attributes=True)


class SessionMetricSummary(BaseModel):
    avg_focus_percentage: float
    avg_active_students: float
    total_using_phone: int
    total_raised_hand: int


class ClassroomSessionListRead(BaseModel):
    id: uuid.UUID
    classroom_name: Optional[str]
    teacher_name: Optional[str]
    subject: Optional[str]
    start_time: datetime
    end_time: Optional[datetime]
    status: str
    camera_id: Optional[uuid.UUID] = None
    camera_name: Optional[str] = None
    metrics_summary: SessionMetricSummary
    model_config = ConfigDict(from_attributes=True)


class PaginatedClassroomSessionResponse(BaseModel):
    items: List[ClassroomSessionListRead]
    meta: PaginationMeta


class ClassroomSessionDetailRead(BaseModel):
    id: uuid.UUID
    classroom_id: Optional[uuid.UUID]
    classroom_name: Optional[str]
    teacher_id: Optional[uuid.UUID]
    teacher_name: Optional[str]
    camera_id: Optional[uuid.UUID] = None
    camera_name: Optional[str]
    subject: Optional[str]
    start_time: datetime
    end_time: Optional[datetime]
    status: str
    metrics_summary: SessionMetricSummary
    present_count: int = 0
    absent_count: int = 0
    model_config = ConfigDict(from_attributes=True)


class SessionStudentMetricRead(BaseModel):
    id: uuid.UUID
    student_id: Optional[uuid.UUID]
    student_name: Optional[str]
    student_nis: Optional[str]
    focus_score: float
    distracted_score: float
    raised_hand_count: int
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class PaginatedSessionStudentMetricResponse(BaseModel):
    items: List[SessionStudentMetricRead]
    meta: PaginationMeta


class RegisterStudentRequest(BaseModel):
    student_id: uuid.UUID


class StudentOption(BaseModel):
    id: uuid.UUID
    name: str
    model_config = ConfigDict(from_attributes=True)


class ClassroomSessionCreateResponse(ClassroomSessionEditRead):
    students: List[StudentOption]


class StudentAttendanceOption(BaseModel):
    id: uuid.UUID
    name: str
    status: str
    nis: Optional[str] = None


class EvaluationStatusResponse(BaseModel):
    stream_active: bool
    is_evaluating: bool


class RegisterStudentResponse(BaseModel):
    center_x: int
    center_y: int
    present_count: int
    absent_count: int
    students: List[StudentAttendanceOption]
