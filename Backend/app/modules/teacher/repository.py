import uuid
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, cast, String
from typing import Optional
from app.modules.teacher.schema import TeacherCreate
from app.models.teacher import Teacher
from app.models.classroom_session import ClassroomSession
from app.models.classroom_metric import ClassroomMetric
from app.models.classroom import Classroom

class TeacherRepository:
    @staticmethod
    def get_by_email(db: Session, email: str):
        return db.query(Teacher).filter(Teacher.email == email, Teacher.deleted_at == None).first()

    @staticmethod
    def get_by_id(db: Session, teacher_id: uuid.UUID):
        return db.query(Teacher).filter(Teacher.id == teacher_id, Teacher.deleted_at == None).first()

    @staticmethod
    def get_all(db: Session, skip: int = 0, limit: int = 10, search: Optional[str] = None):
        query = db.query(Teacher).filter(Teacher.deleted_at == None)
        if search:
            try:
                search_uuid = uuid.UUID(search)
                query = query.filter(Teacher.id == search_uuid)
            except ValueError:
                search_term = f"%{search}%"
                query = query.filter(
                    or_(
                        Teacher.name.ilike(search_term),
                        Teacher.nip.ilike(search_term),
                        Teacher.email.ilike(search_term),
                        Teacher.role.ilike(search_term)
                    )
                )

        total = query.count()
        items = query.offset(skip).limit(limit).all()
        return items, total

    @staticmethod
    def create(db: Session, data: TeacherCreate, hashed_pw: str, photo_filepath: str = None):
        teacher = Teacher(
            name=data.name,
            nip=data.nip,
            email=data.email,
            password_hash=hashed_pw,
            role=data.role,
            photo_filepath=photo_filepath
        )
        db.add(teacher)
        db.commit()
        db.refresh(teacher)
        return teacher

    @staticmethod
    def update(db: Session, teacher: Teacher, update_data: dict):
        for key, value in update_data.items():
            setattr(teacher, key, value)
        
        db.commit()
        db.refresh(teacher)
        return teacher

    @staticmethod
    def soft_delete(db: Session, teacher_id: str):
        teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
        if not teacher:
            return None

        teacher.deleted_at = func.now()
        db.commit()
        return teacher


    @staticmethod
    def get_by_email_or_nip(db: Session, email: str, nip: str):
        return db.query(Teacher).filter(
            Teacher.deleted_at == None,
            or_(Teacher.email == email, Teacher.nip == nip)
        ).first()

    @staticmethod
    def get_soft_deleted(db: Session, email: str, nip: str):
        return db.query(Teacher).filter(
            Teacher.deleted_at != None,
            or_(
                Teacher.email == email,
                Teacher.nip == nip
            )
        ).first()

    @staticmethod
    def reactivate_teacher(db: Session, teacher: Teacher, data: TeacherCreate, hashed_pw: str, photo_filepath: str):
        teacher.deleted_at = None
        teacher.name = data.name
        teacher.nip = data.nip
        teacher.email = data.email
        teacher.password_hash = hashed_pw
        teacher.role = data.role
        teacher.photo_filepath = photo_filepath
        
        db.commit()
        db.refresh(teacher)
        return teacher

    @staticmethod
    def get_detail_with_avg_metrics(db: Session, teacher_id: uuid.UUID):
        return db.query(
            Teacher,
            func.coalesce(func.avg(ClassroomMetric.focus_percentage), 0).label("avg_focus"),
            func.coalesce(func.avg(ClassroomMetric.active_students), 0).label("avg_active"),
            func.coalesce(func.avg(ClassroomMetric.using_phone_count), 0).label("avg_phone"),
            func.coalesce(func.avg(ClassroomMetric.raised_hand_count), 0).label("avg_raised")
        ).outerjoin(
            ClassroomSession, Teacher.id == ClassroomSession.teacher_id
        ).outerjoin(
            ClassroomMetric, ClassroomSession.id == ClassroomMetric.session_id
        ).filter(
            Teacher.id == teacher_id,
            Teacher.deleted_at.is_(None)
        ).group_by(Teacher.id).first()

    @staticmethod
    def get_teacher_sessions(db: Session, teacher_id: uuid.UUID, skip: int, limit: int, search: Optional[str] = None):
        query = db.query(
            ClassroomSession,
            ClassroomMetric,
            Classroom.name.label("classroom_name")
        ).outerjoin(
            Classroom, ClassroomSession.classroom_id == Classroom.id
        ).outerjoin(
            ClassroomMetric, ClassroomSession.id == ClassroomMetric.session_id
        ).filter(
            ClassroomSession.teacher_id == teacher_id,
            ClassroomSession.deleted_at.is_(None)
        )
        if search:
            search_term = f"%{search}%"
            search_filters = [
                ClassroomSession.subject.ilike(search_term),
                Classroom.name.ilike(search_term),
                cast(ClassroomSession.start_time, String).ilike(search_term)
            ]
            try:
                search_uuid = uuid.UUID(search)
                search_filters.append(ClassroomSession.id == search_uuid)
            except ValueError:
                pass
            query = query.filter(or_(*search_filters))
        total = query.count()
        items = query.order_by(ClassroomSession.start_time.desc()).offset(skip).limit(limit).all()
        return items, total
