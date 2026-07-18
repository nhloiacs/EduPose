from __future__ import annotations
from datetime import datetime
from sqlalchemy import String, ForeignKey, DateTime
from app.database.base import BaseEntity
from sqlalchemy.orm import mapped_column, relationship, Mapped
from typing import List, Optional
import uuid

class Classroom(BaseEntity):
    __tablename__ = "classrooms"
    name: Mapped[str] = mapped_column(String(50), unique=True)    
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True) 
    students: Mapped[List["Student"]] = relationship(back_populates="classroom", cascade="all, delete-orphan")
    sessions: Mapped[List["ClassroomSession"]] = relationship(back_populates="classroom", cascade="all, delete-orphan")
