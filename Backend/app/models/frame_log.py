import uuid
from datetime import datetime
from sqlalchemy import DateTime, Text, ForeignKey, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base
from typing import Optional

class FrameLog(Base):
    __tablename__ = "frame_logs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid())
    session_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("classroom_sessions.id", ondelete="CASCADE"), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    payload: Mapped[dict] = mapped_column(JSONB)
    image_filepath: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    session: Mapped[Optional["ClassroomSession"]] = relationship(back_populates="frame_logs")