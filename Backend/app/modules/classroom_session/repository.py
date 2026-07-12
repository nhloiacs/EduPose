import uuid
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_, cast, String
from app.models.classroom_session import ClassroomSession
from app.models.classroom import Classroom
from app.models.teacher import Teacher
from app.models.classroom_metric import ClassroomMetric
from app.models.student import Student
from app.models.student_metric import StudentMetric

class ClassroomSessionRepository:
    @staticmethod
    def get_all(db: Session, skip: int = 0, limit: int = 10, search: str = None):
        query = db.query(
            ClassroomSession,
            Classroom.name.label("classroom_name"),
            Teacher.name.label("teacher_name"),
            # --- Tambahan Agregasi Metrik ---
            func.coalesce(func.avg(ClassroomMetric.focus_percentage), 0).label("avg_focus"),
            func.coalesce(func.avg(ClassroomMetric.active_students), 0).label("avg_active"),
            func.coalesce(func.sum(ClassroomMetric.using_phone_count), 0).label("sum_phone"),
            func.coalesce(func.sum(ClassroomMetric.raised_hand_count), 0).label("sum_raised")
        ).outerjoin(
            Classroom, ClassroomSession.classroom_id == Classroom.id
        ).outerjoin(
            Teacher, ClassroomSession.teacher_id == Teacher.id
        ).outerjoin(
            ClassroomMetric, ClassroomSession.id == ClassroomMetric.session_id # <--- Tambahan Join
        ).filter(ClassroomSession.deleted_at.is_(None))

        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    ClassroomSession.subject.ilike(search_term),
                    Classroom.name.ilike(search_term),
                    Teacher.name.ilike(search_term),
                    cast(ClassroomSession.start_time, String).ilike(search_term)
                )
            )
        query = query.group_by(ClassroomSession.id, Classroom.id, Teacher.id)
        total = query.count()
        items = query.order_by(ClassroomSession.start_time.desc()).offset(skip).limit(limit).all()
        return items, total

    @staticmethod
    def get_subject_only(db: Session, session_id: uuid.UUID):
        return db.query(ClassroomSession.id, ClassroomSession.subject).filter(
            ClassroomSession.id == session_id,
            ClassroomSession.deleted_at.is_(None)
        ).first()

    @staticmethod
    def get_detail_with_metrics(db: Session, session_id: uuid.UUID):
        return db.query(
            ClassroomSession,
            Classroom.name.label("classroom_name"),
            Teacher.name.label("teacher_name"),
            func.coalesce(func.avg(ClassroomMetric.focus_percentage), 0).label("avg_focus"),
            func.coalesce(func.avg(ClassroomMetric.active_students), 0).label("avg_active"),
            func.coalesce(func.sum(ClassroomMetric.using_phone_count), 0).label("sum_phone"),
            func.coalesce(func.sum(ClassroomMetric.raised_hand_count), 0).label("sum_raised")
        ).outerjoin(
            Classroom, ClassroomSession.classroom_id == Classroom.id
        ).outerjoin(
            Teacher, ClassroomSession.teacher_id == Teacher.id
        ).outerjoin(
            ClassroomMetric, ClassroomSession.id == ClassroomMetric.session_id
        ).filter(
            ClassroomSession.id == session_id,
            ClassroomSession.deleted_at.is_(None)
        ).group_by(
            ClassroomSession.id, Classroom.id, Teacher.id
        ).first()

    @staticmethod
    def update_subject(db: Session, session_id: uuid.UUID, new_subject: str):
        session = db.query(ClassroomSession).filter(
            ClassroomSession.id == session_id,
            ClassroomSession.deleted_at.is_(None)
        ).first()
        
        if session:
            session.subject = new_subject
            db.commit()
            db.refresh(session)
        return session

    @staticmethod
    def soft_delete(db: Session, session_id: uuid.UUID):
        session = db.query(ClassroomSession).filter(
            ClassroomSession.id == session_id,
            ClassroomSession.deleted_at.is_(None)
        ).first()
        
        if session:
            session.deleted_at = func.now()
            db.commit()
        return session

    @staticmethod
    def get_session_students_metrics(db: Session, session_id: uuid.UUID, skip: int = 0, limit: int = 10, search: str = None):
        query = db.query(
            StudentMetric,
            Student.name.label("student_name"),
            Student.nis.label("student_nis")
        ).join(
            Student, StudentMetric.student_id == Student.id
        ).filter(
            StudentMetric.session_id == session_id
        )
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    Student.name.ilike(search_term),
                    Student.nis.ilike(search_term)
                )
            )
        total = query.count()
        items = query.order_by(Student.name.asc()).offset(skip).limit(limit).all()
        return items, total
