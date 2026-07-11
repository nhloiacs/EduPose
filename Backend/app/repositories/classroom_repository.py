import uuid
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_, cast, String
from typing import Optional
from app.modules.classroom.schema import ClassroomCreate
from app.models.classroom import Classroom
from app.models.classroom_session import ClassroomSession
from app.models.classroom_metric import ClassroomMetric
from app.models.teacher import Teacher
from app.models.student import Student

DEFAULT_CAMERA_ID = uuid.UUID("11111111-1111-1111-1111-111111111111")

class ClassroomRepository:
    @staticmethod
    def get_by_name(db: Session, name: str):
        return db.query(Classroom).filter(Classroom.name == name, Classroom.deleted_at == None).first()

    @staticmethod
    def get_by_id(db: Session, classroom_id: uuid.UUID):
        return db.query(Classroom).filter(Classroom.id == classroom_id, Classroom.deleted_at == None).first()

    @staticmethod
    def get_all(db: Session, skip: int = 0, limit: int = 10, search: Optional[str] = None):
        query = db.query(Classroom).filter(Classroom.deleted_at == None)
        if search:
            try:
                search_uuid = uuid.UUID(search)
                query = query.filter(Classroom.id == search_uuid)
            except ValueError:
                search_term = f"%{search}%"
                query = query.filter(Classroom.name.ilike(search_term))

        total = query.count()
        items = query.offset(skip).limit(limit).all()
        return items, total

    @staticmethod
    def create(db: Session, data: ClassroomCreate):
        classroom = Classroom(
            name=data.name,
            camera_id=DEFAULT_CAMERA_ID 
        )
        db.add(classroom)
        db.commit()
        db.refresh(classroom)
        return classroom

    @staticmethod
    def update(db: Session, classroom: Classroom, update_data: dict):
        for key, value in update_data.items():
            setattr(classroom, key, value)
        
        db.commit()
        db.refresh(classroom)
        return classroom

    @staticmethod
    def soft_delete(db: Session, classroom_id: uuid.UUID):
        classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
        if not classroom:
            return None

        classroom.deleted_at = func.now()
        db.commit()
        return classroom

    @staticmethod
    def get_soft_deleted_by_name(db: Session, name: str):
        return db.query(Classroom).filter(
            Classroom.deleted_at != None,
            Classroom.name == name
        ).first()

    @staticmethod
    def reactivate_classroom(db: Session, classroom: Classroom, data: ClassroomCreate):
        classroom.deleted_at = None
        classroom.name = data.name 
        classroom.camera_id = DEFAULT_CAMERA_ID
        db.commit()
        db.refresh(classroom)
        return classroom

    @staticmethod
    def get_detail_with_avg_metrics(db: Session, classroom_id: uuid.UUID):
        return db.query(
            Classroom,
            func.coalesce(func.avg(ClassroomMetric.focus_percentage), 0).label("avg_focus"),
            func.coalesce(func.avg(ClassroomMetric.active_students), 0).label("avg_active"),
            func.coalesce(func.avg(ClassroomMetric.using_phone_count), 0).label("avg_phone"),
            func.coalesce(func.avg(ClassroomMetric.raised_hand_count), 0).label("avg_raised")
        ).outerjoin(
            ClassroomSession, Classroom.id == ClassroomSession.classroom_id
        ).outerjoin(
            ClassroomMetric, ClassroomSession.id == ClassroomMetric.session_id
        ).filter(Classroom.id == classroom_id).group_by(Classroom.id).first()

    @staticmethod
    def get_sessions(db: Session, classroom_id: uuid.UUID, skip: int, limit: int, search: str = None):
        query = db.query(ClassroomSession, ClassroomMetric, Teacher.name.label("teacher_name")).join(
            ClassroomMetric, ClassroomSession.id == ClassroomMetric.session_id, isouter=True
        ).join(
            Teacher, ClassroomSession.teacher_id == Teacher.id, isouter=True
        ).filter(ClassroomSession.classroom_id == classroom_id)

        if search:
            query = query.filter(ClassroomSession.subject.ilike(f"%{search}%"))

        total = query.count()
        items = query.offset(skip).limit(limit).all()
        return items, total

    @staticmethod
    def get_students(db: Session, classroom_id: uuid.UUID, skip: int, limit: int, search: str = None):
        query = db.query(Student).filter(Student.classroom_id == classroom_id, Student.deleted_at.is_(None))
        if search:
            query = query.filter(or_(Student.name.ilike(f"%{search}%"), Student.nis.ilike(f"%{search}%")))
        
        total = query.count()
        items = query.offset(skip).limit(limit).all()
        return items, total
