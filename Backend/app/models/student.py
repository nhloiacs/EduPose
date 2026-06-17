import uuid
from sqlalchemy import String, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import BaseEntity
from typing import List, Optional

class Student(BaseEntity):
    __tablename__ = "students"

    classroom_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("classrooms.id", ondelete="CASCADE"), nullable=True)
    nis: Mapped[Optional[str]] = mapped_column(String(50), unique=True, nullable=True)
    name: Mapped[str] = mapped_column(String(100))
    photo_filepath: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    classroom: Mapped[Optional["Classroom"]] = relationship(back_populates="students")
    seatings: Mapped[List["SessionSeating"]] = relationship(back_populates="student", cascade="all, delete-orphan")
    metrics: Mapped[List["StudentMetric"]] = relationship(back_populates="student", cascade="all, delete-orphan")