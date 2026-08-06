import uuid
from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Union, Literal
from datetime import date, datetime
from enum import Enum

class PrincipalDashboardResponse(BaseModel):
    total_students: int
    total_classrooms: int
    total_teachers: int
    total_subjects: int
    total_cameras: int

class TeacherDashboardMetrics(BaseModel):
    avg_focus_percentage: float
    avg_active_students: float
    total_using_phone: int
    total_raised_hand: int

class TeacherDashboardResponse(BaseModel):
    total_classrooms: int
    total_students: int
    total_subjects: int
    total_cameras: int
    metrics_summary: TeacherDashboardMetrics

class Granularity(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"

class BaseMetric(BaseModel):
    avg_focus_percentage: float
    avg_active_students: float
    total_using_phone: int
    total_raised_hand: int
    model_config = ConfigDict(from_attributes=True)

class DailyMetric(BaseMetric):
    type: Literal["daily"] = "daily"
    date: date

class WeeklyMetric(BaseMetric):
    type: Literal["weekly"] = "weekly"
    year: int
    week: int

class MonthlyMetric(BaseMetric):
    type: Literal["monthly"] = "monthly"
    year: int
    month: int

AggregatedMetric = Union[DailyMetric, WeeklyMetric, MonthlyMetric]


class LiveWarningStudent(BaseModel):
    id: uuid.UUID
    name: str
    classroom_name: Optional[str] = None
    subject: Optional[str] = None
    confidence: Optional[float] = None


class LiveWarningResponse(BaseModel):
    has_active_session: bool
    students: List[LiveWarningStudent] = []

class TopEntityTarget(str, Enum):
    STUDENT = "student"
    CLASSROOM = "classroom"
    TEACHER = "teacher"
    SESSION = "session"
    SUBJECT = "subject"

class TopSortBy(str, Enum):
    FOCUS = "focus"
    PARTICIPATION = "participation"

class TopStudentRead(BaseModel):
    type: Literal["student"] = "student"
    id: uuid.UUID
    name: str
    photo_filepath: Optional[str] = None
    avg_focus_percentage: float
    total_raised_hand: int
    model_config = ConfigDict(from_attributes=True)

class TopTeacherRead(BaseModel):
    type: Literal["teacher"] = "teacher"
    id: uuid.UUID
    name: str
    photo_filepath: Optional[str] = None
    avg_focus_percentage: float
    total_raised_hand: int
    model_config = ConfigDict(from_attributes=True)

class TopClassroomRead(BaseModel):
    type: Literal["classroom"] = "classroom"
    id: uuid.UUID
    name: str
    avg_focus_percentage: float
    total_raised_hand: int
    model_config = ConfigDict(from_attributes=True)

class TopSubjectRead(BaseModel):
    type: Literal["subject"] = "subject"
    name: str
    avg_focus_percentage: float
    total_raised_hand: int
    model_config = ConfigDict(from_attributes=True)

class TopSessionRead(BaseModel):
    type: Literal["session"] = "session"
    id: uuid.UUID
    subject: Optional[str] = None
    start_time: datetime
    end_time: Optional[datetime] = None
    avg_focus_percentage: float
    total_raised_hand: int
    model_config = ConfigDict(from_attributes=True)

TopPerformerResponse = Union[
    TopStudentRead, 
    TopTeacherRead, 
    TopClassroomRead, 
    TopSubjectRead, 
    TopSessionRead
]
