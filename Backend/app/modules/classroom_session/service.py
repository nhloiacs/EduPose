import uuid
from sqlalchemy.orm import Session
from typing import List, Tuple, Optional
from fastapi import HTTPException
from app.core.exceptions import NotFoundException
from app.modules.classroom_session.repository import ClassroomSessionRepository
from app.modules.classroom_session.schema import (
    ClassroomSessionListRead, ClassroomSessionEditRead, 
    ClassroomSessionDetailRead, SessionMetricSummary, ClassroomSessionUpdate,
    SessionStudentMetricRead
)

class ClassroomSessionService:
    @staticmethod
    def _verify_access(session_teacher_id: Optional[uuid.UUID], request_teacher_id: Optional[str]):
        if request_teacher_id and str(session_teacher_id) != str(request_teacher_id):
            raise HTTPException(status_code=403, detail="Akses ditolak. Sesi ini bukan milik Anda.")

    @staticmethod
    def get_all_sessions(
        db: Session, 
        page: int, 
        size: int, 
        search: Optional[str] = None, 
        teacher_id: Optional[str] = None
    ) -> Tuple[List[ClassroomSessionListRead], int]:
        page = max(1, page)
        skip = (page - 1) * size
        teacher_uuid = None
        if teacher_id:
            try:
                teacher_uuid = uuid.UUID(teacher_id)
            except ValueError:
                pass
        items, total = ClassroomSessionRepository.get_all(db, skip, size, search, teacher_uuid)
        result = []
        for session, classroom_name, teacher_name, camera_name, avg_focus, avg_active, sum_phone, sum_raised in items:
            result.append(ClassroomSessionListRead(
                id=session.id,
                classroom_name=classroom_name,
                teacher_name=teacher_name,
                subject=session.subject,
                start_time=session.start_time,
                end_time=session.end_time,
                status=session.status,
                camera_id=session.camera_id, # TAMBAHAN
                camera_name=camera_name,     # TAMBAHAN
                metrics_summary=SessionMetricSummary(
                    avg_focus_percentage=round(avg_focus, 2),
                    avg_active_students=round(avg_active, 2),
                    total_using_phone=int(sum_phone),
                    total_raised_hand=int(sum_raised)
                )
            ))
        return result, total

    @staticmethod
    def get_session_edit(db: Session, session_id: uuid.UUID, teacher_id: Optional[str] = None) -> ClassroomSessionEditRead:
        session = ClassroomSessionRepository.get_subject_only(db, session_id)
        if not session:
            raise NotFoundException("Sesi kelas tidak ditemukan")
        ClassroomSessionService._verify_access(session.teacher_id, teacher_id)
        return ClassroomSessionEditRead(
            id=session.id, 
            subject=session.subject, 
            camera_id=session.camera_id
        )

    @staticmethod
    def get_session_detail(db: Session, session_id: uuid.UUID, teacher_id: Optional[str] = None) -> ClassroomSessionDetailRead:
        result = ClassroomSessionRepository.get_detail_with_metrics(db, session_id)
        if not result:
            raise NotFoundException("Sesi kelas tidak ditemukan")
        session, classroom_name, teacher_name, camera_name, avg_focus, avg_active, sum_phone, sum_raised = result
        ClassroomSessionService._verify_access(session.teacher_id, teacher_id)
        return ClassroomSessionDetailRead(
            id=session.id,
            classroom_id=session.classroom_id,
            classroom_name=classroom_name,
            teacher_id=session.teacher_id,
            teacher_name=teacher_name,
            camera_id=session.camera_id,
            camera_name=camera_name,
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
    def update_session(db: Session, session_id: uuid.UUID, data: ClassroomSessionUpdate, teacher_id: Optional[str] = None) -> ClassroomSessionEditRead:
        session = ClassroomSessionRepository.get_subject_only(db, session_id)
        if not session:
            raise NotFoundException("Sesi kelas tidak ditemukan")
        ClassroomSessionService._verify_access(session.teacher_id, teacher_id)
        updated_session = ClassroomSessionRepository.update(
            db, 
            session_id, 
            subject=data.subject, 
            camera_id=data.camera_id
        )
        return ClassroomSessionEditRead(
            id=updated_session.id, 
            subject=updated_session.subject,
            camera_id=updated_session.camera_id
        )

    @staticmethod
    def delete_session(db: Session, session_id: uuid.UUID, teacher_id: Optional[str] = None):
        session = ClassroomSessionRepository.get_subject_only(db, session_id)
        if not session:
            raise NotFoundException("Sesi kelas tidak ditemukan")
        ClassroomSessionService._verify_access(session.teacher_id, teacher_id)
        deleted = ClassroomSessionRepository.soft_delete(db, session_id)
        return deleted

    @staticmethod
    def get_session_students(
        db: Session, 
        session_id: uuid.UUID, 
        page: int, 
        size: int, 
        search: Optional[str] = None, 
        teacher_id: Optional[str] = None
    ):
        session = ClassroomSessionRepository.get_subject_only(db, session_id)
        if not session:
            raise NotFoundException("Sesi kelas tidak ditemukan")
        ClassroomSessionService._verify_access(session.teacher_id, teacher_id)
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
