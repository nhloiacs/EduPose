import uuid
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from app.models.classroom import Classroom
from app.schemas.classroom import ClassroomCreate
from typing import Optional

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
            camera_id=DEFAULT_CAMERA_ID  # Hardcode camera_id sesuai rencana
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