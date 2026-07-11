from sqlalchemy import String, Boolean, Text, ForeignKey, func, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import BaseEntity
from typing import List, Optional
import datetime

class Teacher(BaseEntity):
    __tablename__ = "teachers"

    name: Mapped[str] = mapped_column(String(100))
    nip: Mapped[Optional[str]] = mapped_column(String(50), unique=True, nullable=True)
    email: Mapped[str] = mapped_column(String(255), unique=True)
    password_hash: Mapped[str] = mapped_column(Text)
    role: Mapped[str] = mapped_column(String(20))
    photo_filepath: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, server_default="true")
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    sessions: Mapped[List["ClassroomSession"]] = relationship(back_populates="teacher")