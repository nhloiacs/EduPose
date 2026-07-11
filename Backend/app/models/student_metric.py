import uuid
from datetime import datetime
from sqlalchemy import Integer, Float, DateTime, ForeignKey,UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base
from typing import Optional

class StudentMetric(Base):
    __tablename__ = "student_metrics"
    __table_args__ = (UniqueConstraint("session_id", "student_id", name="uix_session_student_metric"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid())
    session_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("classroom_sessions.id", ondelete="CASCADE"), nullable=True)
    student_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("students.id", ondelete="CASCADE"), nullable=True)
    focus_score: Mapped[float] = mapped_column(Float, server_default="0")
    distracted_score: Mapped[float] = mapped_column(Float, server_default="0")
    raised_hand_count: Mapped[int] = mapped_column(Integer, server_default="0")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    session: Mapped[Optional["ClassroomSession"]] = relationship(back_populates="student_metrics")
    student: Mapped[Optional["Student"]] = relationship(back_populates="metrics")