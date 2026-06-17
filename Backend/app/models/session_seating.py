import uuid
from sqlalchemy import Integer, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base
from typing import Optional

class SessionSeating(Base):
    __tablename__ = "session_seatings"
    __table_args__ = (UniqueConstraint("session_id", "student_id", name="uix_session_student_seating"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid())
    session_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("classroom_sessions.id", ondelete="CASCADE"), nullable=True)
    student_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("students.id", ondelete="CASCADE"), nullable=True)
    pos_x: Mapped[int] = mapped_column(Integer)
    pos_y: Mapped[int] = mapped_column(Integer)
    attendance_status: Mapped[str] = mapped_column(String(20), server_default="PRESENT")

    session: Mapped[Optional["ClassroomSession"]] = relationship(back_populates="seatings")
    student: Mapped[Optional["Student"]] = relationship(back_populates="seatings")