import uuid
from datetime import datetime
from sqlalchemy import DateTime, Integer, Float, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base
from typing import Optional

class ClassroomMetric(Base):
    __tablename__ = "classroom_metrics"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid())
    session_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("classroom_sessions.id", ondelete="CASCADE"), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    active_students: Mapped[int] = mapped_column(Integer, server_default="0")
    focus_percentage: Mapped[float] = mapped_column(Float, server_default="0")
    using_phone_count: Mapped[int] = mapped_column(Integer, server_default="0")
    raised_hand_count: Mapped[int] = mapped_column(Integer, server_default="0")

    session: Mapped[Optional["ClassroomSession"]] = relationship(back_populates="classroom_metrics")