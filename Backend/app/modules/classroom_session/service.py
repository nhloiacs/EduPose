import uuid
from sqlalchemy.orm import Session
from typing import List, Tuple, Optional
from app.core.exceptions import NotFoundException
from app.modules.classroom_session.repository import ClassroomSessionRepository
from app.modules.classroom_session.schema import (
    ClassroomSessionListRead, ClassroomSessionEditRead, 
    ClassroomSessionDetailRead, SessionMetricSummary, ClassroomSessionUpdate
)
from app.modules.classroom_session.schema import SessionStudentMetricRead

class ClassroomSessionService:
    @staticmethod
    def get_all_sessions(db: Session, page: int, size: int, search: Optional[str] = None) -> Tuple[List[ClassroomSessionListRead], int]:
        page = max(1, page)
        skip = (page - 1) * size
        items, total = ClassroomSessionRepository.get_all(db, skip, size, search)
        
        result = []
        for session, classroom_name, teacher_name in items:
            result.append(ClassroomSessionListRead(
                id=session.id,
                classroom_name=classroom_name,
                teacher_name=teacher_name,
                subject=session.subject,
                start_time=session.start_time,
                end_time=session.end_time,
                status=session.status
            ))
        return result, total

    @staticmethod
    def get_session_edit(db: Session, session_id: uuid.UUID) -> ClassroomSessionEditRead:
        result = ClassroomSessionRepository.get_subject_only(db, session_id)
        if not result:
            raise NotFoundException("Sesi kelas tidak ditemukan")
        
        session_id_res, subject = result
        return ClassroomSessionEditRead(id=session_id_res, subject=subject)

    @staticmethod
    def get_session_detail(db: Session, session_id: uuid.UUID) -> ClassroomSessionDetailRead:
        result = ClassroomSessionRepository.get_detail_with_metrics(db, session_id)
        if not result:
            raise NotFoundException("Sesi kelas tidak ditemukan")
        
        session, classroom_name, teacher_name, avg_focus, avg_active, sum_phone, sum_raised = result
        
        return ClassroomSessionDetailRead(
            id=session.id,
            classroom_id=session.classroom_id,
            classroom_name=classroom_name,
            teacher_id=session.teacher_id,
            teacher_name=teacher_name,
            subject=session.subject,
            start_time=session.start_time,
            end_time=session.end_time,
            status=session.status,
            metrics_summary=SessionMetricSummary(
                avg_focus_percentage=round(avg_focus, 2),
                avg_active_students=round(avg_active, 2),
                total_using_phone=int(sum_phone),
                total_raised_hand=int(sum_raised)
            )
        )

    @staticmethod
    def update_session(db: Session, session_id: uuid.UUID, data: ClassroomSessionUpdate) -> ClassroomSessionEditRead:
        existing = ClassroomSessionRepository.get_subject_only(db, session_id)
        if not existing:
            raise NotFoundException("Sesi kelas tidak ditemukan")
        
        updated_session = ClassroomSessionRepository.update_subject(db, session_id, data.subject)
        return ClassroomSessionEditRead(id=updated_session.id, subject=updated_session.subject)

    @staticmethod
    def delete_session(db: Session, session_id: uuid.UUID):
        deleted = ClassroomSessionRepository.soft_delete(db, session_id)
        if not deleted:
            raise NotFoundException("Sesi kelas tidak ditemukan")
        return deleted

# Jangan lupa import schema yang baru dibikin:


    @staticmethod
    def get_session_students(db: Session, session_id: uuid.UUID, page: int, size: int, search: Optional[str] = None):
        existing = ClassroomSessionRepository.get_subject_only(db, session_id)
        if not existing:
            raise NotFoundException("Sesi kelas tidak ditemukan")
        page = max(1, page)
        skip = (page - 1) * size
        items, total = ClassroomSessionRepository.get_session_students_metrics(db, session_id, skip, size, search)
        result = []
        for metric, student_name, student_nis in items:
            result.append(SessionStudentMetricRead(
                id=metric.id,
                student_id=metric.student_id,
                student_name=student_name,
                student_nis=student_nis,
                focus_score=round(metric.focus_score, 2),
                distracted_score=round(metric.distracted_score, 2),
                raised_hand_count=metric.raised_hand_count,
                updated_at=metric.updated_at
            ))
        return result, total
