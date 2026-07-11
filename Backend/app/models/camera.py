from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import BaseEntity
from typing import Optional

class Camera(BaseEntity):
    __tablename__ = "cameras"

    device_code: Mapped[str] = mapped_column(String(50), unique=True)
    status: Mapped[str] = mapped_column(String(20), server_default="ONLINE")

    classroom: Mapped[Optional["Classroom"]] = relationship(back_populates="camera")