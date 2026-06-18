from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_
from app.models.student import Student
from app.schemas.student import StudentCreate
from typing import Optional
import uuid

class StudentRepository:
    @staticmethod
    def get_by_nis(db: Session, nis: str):
        return db.query(Student).filter(Student.nis == nis, Student.deleted_at == None).first()

    @staticmethod
    def get_by_id(db: Session, student_id: uuid.UUID):
        return db.query(Student).options(joinedload(Student.classroom)).filter(
            Student.id == student_id, 
            Student.deleted_at == None
        ).first()

    @staticmethod
    def get_all(db: Session, skip: int = 0, limit: int = 10, search: Optional[str] = None):
        query = db.query(Student).options(joinedload(Student.classroom)).filter(Student.deleted_at == None)        
        if search:
            try:
                search_uuid = uuid.UUID(search)
                query = query.filter(Student.id == search_uuid)
            except ValueError:
                search_term = f"%{search}%"
                query = query.filter(
                    or_(
                        Student.name.ilike(search_term),
                        Student.nis.ilike(search_term)
                    )
                )

        total = query.count()
        items = query.offset(skip).limit(limit).all()
        return items, total

    @staticmethod
    def create(db: Session, data: StudentCreate, photo_filepath: str = None):
        student = Student(
            name=data.name,
            nis=data.nis,
            classroom_id=data.classroom_id,
            photo_filepath=photo_filepath
        )
        db.add(student)
        db.commit()
        db.refresh(student)
        return student

    @staticmethod
    def update(db: Session, student: Student, update_data: dict):
        for key, value in update_data.items():
            setattr(student, key, value)
        db.commit()
        db.refresh(student)
        return student

    @staticmethod
    def soft_delete(db: Session, student_id: uuid.UUID):
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            return None
        student.deleted_at = func.now()
        db.commit()
        return student

    @staticmethod
    def get_soft_deleted_by_nis(db: Session, nis: str):
        return db.query(Student).filter(
            Student.deleted_at != None,
            Student.nis == nis
        ).first()

    @staticmethod
    def reactivate_student(db: Session, student: Student, data: StudentCreate, photo_filepath: str):
        student.deleted_at = None
        student.name = data.name
        student.nis = data.nis
        student.classroom_id = data.classroom_id
        student.photo_filepath = photo_filepath
        
        db.commit()
        db.refresh(student)
        return student