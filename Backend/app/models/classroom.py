import uuid
from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import BaseEntity
from typing import List, Optional

class Classroom(BaseEntity):
    __tablename__ = "classrooms"

    camera_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("cameras.id", ondelete="SET NULL"), nullable=True)
    name: Mapped[str] = mapped_column(String(50))

    camera: Mapped[Optional["Camera"]] = relationship(back_populates="classroom")
    students: Mapped[List["Student"]] = relationship(back_populates="classroom", cascade="all, delete-orphan")
    sessions: Mapped[List["ClassroomSession"]] = relationship(back_populates="classroom", cascade="all, delete-orphan")