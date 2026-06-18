from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from app.models.teacher import Teacher
from app.schemas.teacher import TeacherCreate
from typing import Optional
import uuid

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