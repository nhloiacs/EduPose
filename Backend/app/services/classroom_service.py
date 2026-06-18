import uuid
from typing import Optional, Tuple, List, Any
from sqlalchemy.orm import Session
from app.core.exceptions import ConflictException, NotFoundException
from app.repositories.classroom_repository import ClassroomRepository
from app.schemas.classroom import ClassroomCreate

class ClassroomService:
    @staticmethod
    def get_classroom_by_id(db: Session, classroom_id: uuid.UUID) -> Any:
        classroom = ClassroomRepository.get_by_id(db, classroom_id)
        if not classroom:
            raise NotFoundException("Classroom tidak ditemukan")
        return classroom

    @staticmethod
    def create_classroom(db: Session, data: ClassroomCreate) -> Any:
        if ClassroomRepository.get_by_name(db, data.name):
            raise ConflictException(f"Classroom dengan nama '{data.name}' sudah terdaftar.")

        deleted_classroom = ClassroomRepository.get_soft_deleted_by_name(db, data.name)
        
        if deleted_classroom:
            return ClassroomRepository.reactivate_classroom(
                db=db, 
                classroom=deleted_classroom, 
                data=data
            )

        return ClassroomRepository.create(db, data)

    @staticmethod
    def get_all_classrooms(db: Session, page: int, size: int, search: Optional[str] = None) -> Tuple[List[Any], int]:
        page = max(1, page)
        skip = (page - 1) * size
        
        items, total = ClassroomRepository.get_all(db, skip, size, search)
        return items, total

    @staticmethod
    def update_classroom(db: Session, classroom_id: uuid.UUID, update_data: dict) -> Any:
        classroom = ClassroomRepository.get_by_id(db, classroom_id)
        if not classroom:
            raise NotFoundException("Classroom tidak ditemukan")

        if "name" in update_data and update_data["name"] != classroom.name:
            if ClassroomRepository.get_by_name(db, update_data["name"]):
                raise ConflictException(f"Nama classroom '{update_data['name']}' sudah digunakan.")

        return ClassroomRepository.update(db, classroom, update_data)

    @staticmethod
    def delete_classroom(db: Session, classroom_id: uuid.UUID) -> Any:
        classroom = ClassroomRepository.soft_delete(db, classroom_id)
        if not classroom:
            raise NotFoundException("Classroom tidak ditemukan")
        return classroom