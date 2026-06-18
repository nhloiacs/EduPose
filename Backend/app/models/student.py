from sqlalchemy import String, Text, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import BaseEntity
from typing import List, Optional
import uuid
import datetime

class Student(BaseEntity):
    __tablename__ = "students"

    classroom_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("classrooms.id", ondelete="CASCADE"), nullable=True)
    nis: Mapped[Optional[str]] = mapped_column(String(50), unique=True, nullable=True)
    name: Mapped[str] = mapped_column(String(100))
    photo_filepath: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    classroom: Mapped[Optional["Classroom"]] = relationship(back_populates="students")
    seatings: Mapped[List["SessionSeating"]] = relationship(back_populates="student", cascade="all, delete-orphan")
    metrics: Mapped[List["StudentMetric"]] = relationship(back_populates="student", cascade="all, delete-orphan")