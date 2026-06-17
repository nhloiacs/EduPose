import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import BaseEntity
from typing import List, Optional

class ClassroomSession(BaseEntity):
    __tablename__ = "classroom_sessions"

    classroom_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("classrooms.id", ondelete="CASCADE"), nullable=True)
    teacher_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("teachers.id", ondelete="SET NULL"), nullable=True)
    subject: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    end_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(20), server_default="ONGOING")

    classroom: Mapped[Optional["Classroom"]] = relationship(back_populates="sessions")
    teacher: Mapped[Optional["Teacher"]] = relationship(back_populates="sessions")
    frame_logs: Mapped[List["FrameLog"]] = relationship(back_populates="session", cascade="all, delete-orphan")
    classroom_metrics: Mapped[List["ClassroomMetric"]] = relationship(back_populates="session", cascade="all, delete-orphan")
    seatings: Mapped[List["SessionSeating"]] = relationship(back_populates="session", cascade="all, delete-orphan")
    student_metrics: Mapped[List["StudentMetric"]] = relationship(back_populates="session", cascade="all, delete-orphan")