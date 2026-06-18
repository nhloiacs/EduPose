import uuid
from pathlib import Path
from typing import Optional, Tuple, List, Any
from fastapi import UploadFile
from sqlalchemy.orm import Session
from app.core.exceptions import ConflictException, NotFoundException
from app.repositories.student_repository import StudentRepository
from app.schemas.student import StudentCreate, StudentRead
from app.utils.file_manager import FileManager

class StudentService:
    UPLOAD_DIR = Path("app/static/images/students")

    @staticmethod
    def _map_to_read_schema(student: Any) -> StudentRead:
        return StudentRead(
            id=student.id,
            name=student.name,
            nis=student.nis,
            classroom_id=student.classroom_id,
            classroom_name=student.classroom.name if student.classroom else "Unknown",
            photo_filepath=student.photo_filepath
        )

    @staticmethod
    def get_student_by_id(db: Session, student_id: uuid.UUID) -> StudentRead:
        student = StudentRepository.get_by_id(db, student_id)
        if not student:
            raise NotFoundException("Student tidak ditemukan")
        return StudentService._map_to_read_schema(student)

    @staticmethod
    def create_student(db: Session, data: StudentCreate, file: UploadFile) -> StudentRead:
        if StudentRepository.get_by_nis(db, data.nis):
            raise ConflictException("NIS sudah terdaftar.")

        photo_url = FileManager.save_file(file, StudentService.UPLOAD_DIR)

        deleted_student = StudentRepository.get_soft_deleted_by_nis(db, data.nis)
        
        if deleted_student:
            student = StudentRepository.reactivate_student(
                db=db, 
                student=deleted_student, 
                data=data, 
                photo_filepath=photo_url
            )
        else:
            student = StudentRepository.create(db, data, photo_url)
        
        return StudentService._map_to_read_schema(student)

    @staticmethod
    def get_all_students(db: Session, page: int, size: int, search: Optional[str] = None) -> Tuple[List[StudentRead], int]:
        page = max(1, page)
        skip = (page - 1) * size
        items, total = StudentRepository.get_all(db, skip, size, search)
        
        result = [StudentService._map_to_read_schema(item) for item in items]
        return result, total

    @staticmethod
    def update_student(db: Session, student_id: uuid.UUID, update_data: dict, file: Optional[UploadFile] = None) -> StudentRead:
        student = StudentRepository.get_by_id(db, student_id)
        if not student:
            raise NotFoundException("Student tidak ditemukan")

        if file:
            FileManager.delete_file(student.photo_filepath)
            update_data["photo_filepath"] = FileManager.save_file(file, StudentService.UPLOAD_DIR)

        if "nis" in update_data and update_data["nis"] != student.nis:
            if StudentRepository.get_by_nis(db, update_data["nis"]):
                raise ConflictException("NIS sudah digunakan oleh siswa lain")

        updated_student = StudentRepository.update(db, student, update_data)
        return StudentService._map_to_read_schema(updated_student)

    @staticmethod
    def delete_student(db: Session, student_id: uuid.UUID) -> Any:
        student = StudentRepository.soft_delete(db, student_id)
        if not student:
            raise NotFoundException("Student tidak ditemukan")
        return student