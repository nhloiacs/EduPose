import uuid
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, cast, String
from typing import Optional
from app.models.classroom_session import ClassroomSession
from app.models.classroom import Classroom
from app.models.teacher import Teacher
from app.models.camera import Camera
from app.models.classroom_metric import ClassroomMetric
from app.models.student import Student
from app.models.student_metric import StudentMetric
from app.models.session_seating import SessionSeating


class ClassroomSessionRepository:
    @staticmethod
    def get_by_id(db: Session, session_id: uuid.UUID):
        return (
            db.query(ClassroomSession)
            .filter(
                ClassroomSession.id == session_id, ClassroomSession.deleted_at.is_(None)
            )
            .first()
        )

    @staticmethod
    def get_active_session_by_classroom(db: Session, classroom_id: uuid.UUID):
        return (
            db.query(ClassroomSession)
            .filter(
                ClassroomSession.classroom_id == classroom_id,
                ClassroomSession.status == "ONGOING",
                ClassroomSession.deleted_at.is_(None),
            )
            .first()
        )

    @staticmethod
    def get_active_session_by_camera(db: Session, camera_id: uuid.UUID):
        return (
            db.query(ClassroomSession)
            .filter(
                ClassroomSession.camera_id == camera_id,
                ClassroomSession.status == "ONGOING",
                ClassroomSession.deleted_at.is_(None),
            )
            .first()
        )

    @staticmethod
    def create(db: Session, data: dict):
        session = ClassroomSession(**data)
        db.add(session)
        db.commit()
        db.refresh(session)
        return session

    @staticmethod
    def get_all(
        db: Session,
        skip: int = 0,
        limit: int = 10,
        search: str = None,
        teacher_id: uuid.UUID = None,
    ):
        query = (
            db.query(
                ClassroomSession,
                Classroom.name.label("classroom_name"),
                Teacher.name.label("teacher_name"),
                Camera.name.label("camera_name"),
                func.coalesce(func.avg(ClassroomMetric.focus_percentage), 0).label(
                    "avg_focus"
                ),
                func.coalesce(func.avg(ClassroomMetric.active_students), 0).label(
                    "avg_active"
                ),
                func.coalesce(func.sum(ClassroomMetric.using_phone_count), 0).label(
                    "sum_phone"
                ),
                func.coalesce(func.sum(ClassroomMetric.raised_hand_count), 0).label(
                    "sum_raised"
                ),
            )
            .outerjoin(Classroom, ClassroomSession.classroom_id == Classroom.id)
            .outerjoin(Teacher, ClassroomSession.teacher_id == Teacher.id)
            .outerjoin(Camera, ClassroomSession.camera_id == Camera.id)
            .outerjoin(
                ClassroomMetric, ClassroomSession.id == ClassroomMetric.session_id
            )
            .filter(ClassroomSession.deleted_at.is_(None))
        )
        if teacher_id:
            query = query.filter(ClassroomSession.teacher_id == teacher_id)
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    ClassroomSession.subject.ilike(search_term),
                    Classroom.name.ilike(search_term),
                    Teacher.name.ilike(search_term),
                    Camera.name.ilike(search_term),
                    cast(ClassroomSession.start_time, String).ilike(search_term),
                )
            )
        query = query.group_by(ClassroomSession.id, Classroom.id, Teacher.id, Camera.id)
        total = query.count()
        items = (
            query.order_by(ClassroomSession.start_time.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
        return items, total

    @staticmethod
    def get_subject_only(db: Session, session_id: uuid.UUID):
        return (
            db.query(ClassroomSession)
            .filter(
                ClassroomSession.id == session_id, ClassroomSession.deleted_at.is_(None)
            )
            .first()
        )

    @staticmethod
    def get_detail_with_metrics(db: Session, session_id: uuid.UUID):
        result = (
            db.query(
                ClassroomSession,
                Classroom.name.label("classroom_name"),
                Teacher.name.label("teacher_name"),
                Camera.name.label("camera_name"),
                func.coalesce(func.avg(ClassroomMetric.focus_percentage), 0).label(
                    "avg_focus"
                ),
                func.coalesce(func.avg(ClassroomMetric.active_students), 0).label(
                    "avg_active"
                ),
                func.coalesce(func.sum(ClassroomMetric.using_phone_count), 0).label(
                    "sum_phone"
                ),
                func.coalesce(func.sum(ClassroomMetric.raised_hand_count), 0).label(
                    "sum_raised"
                ),
            )
            .outerjoin(Classroom, ClassroomSession.classroom_id == Classroom.id)
            .outerjoin(Teacher, ClassroomSession.teacher_id == Teacher.id)
            .outerjoin(Camera, ClassroomSession.camera_id == Camera.id)
            .outerjoin(
                ClassroomMetric, ClassroomSession.id == ClassroomMetric.session_id
            )
            .filter(
                ClassroomSession.id == session_id, ClassroomSession.deleted_at.is_(None)
            )
            .group_by(ClassroomSession.id, Classroom.id, Teacher.id, Camera.id)
            .first()
        )
        if not result:
            return None
        attendance_counts = (
            db.query(SessionSeating.attendance_status, func.count(SessionSeating.id))
            .filter(SessionSeating.session_id == session_id)
            .group_by(SessionSeating.attendance_status)
            .all()
        )
        present_count = 0
        absent_count = 0
        for status, count in attendance_counts:
            if status == "PRESENT":
                present_count = count
            elif status == "ABSENT":
                absent_count = count
        return (*result, present_count, absent_count)

    @staticmethod
    def update(
        db: Session,
        session_id: uuid.UUID,
        subject: Optional[str] = None,
        camera_id: Optional[uuid.UUID] = None,
    ):
        session = (
            db.query(ClassroomSession)
            .filter(
                ClassroomSession.id == session_id, ClassroomSession.deleted_at.is_(None)
            )
            .first()
        )
        if session:
            if subject is not None:
                session.subject = subject
            if camera_id is not None:
                session.camera_id = camera_id
            db.commit()
            db.refresh(session)
        return session

    @staticmethod
    def soft_delete(db: Session, session_id: uuid.UUID):
        session = (
            db.query(ClassroomSession)
            .filter(
                ClassroomSession.id == session_id, ClassroomSession.deleted_at.is_(None)
            )
            .first()
        )
        if session:
            session.deleted_at = func.now()
            db.commit()
        return session

    @staticmethod
    def get_session_students_metrics(
        db: Session,
        session_id: uuid.UUID,
        skip: int = 0,
        limit: int = 10,
        search: str = None,
    ):
        query = (
            db.query(
                StudentMetric,
                Student.name.label("student_name"),
                Student.nis.label("student_nis"),
            )
            .join(Student, StudentMetric.student_id == Student.id)
            .filter(StudentMetric.session_id == session_id)
        )
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(Student.name.ilike(search_term), Student.nis.ilike(search_term))
            )
        total = query.count()
        items = query.order_by(Student.name.asc()).offset(skip).limit(limit).all()
        return items, total
