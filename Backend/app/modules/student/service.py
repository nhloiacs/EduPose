import uuid
from pathlib import Path
from typing import Optional, Tuple, List, Any
from fastapi import UploadFile
from sqlalchemy.orm import Session
from app.core.exceptions import ConflictException, NotFoundException
from app.repositories.student_repository import StudentRepository
from app.modules.student.schema import StudentCreate, StudentRead, StudentDetailResponse, StudentMetricsSummary, StudentSessionRead
from app.utils.file_manager import FileManager

class StudentService:
    UPLOAD_DIR = Path("static/images/students")

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

    @staticmethod
    def get_student_detail_with_metrics(db: Session, student_id: uuid.UUID) -> StudentDetailResponse:
        result = StudentRepository.get_student_detail_with_metrics(db, student_id)
        if not result:
            raise NotFoundException("Student tidak ditemukan")

        student, class_id, class_name, avg_focus, avg_distracted, avg_raised_hand, sum_raised_hand = result

        return StudentDetailResponse(
            id=student.id,
            name=student.name,
            nis=student.nis,
            photo_filepath=student.photo_filepath,
            classroom_id=class_id,
            classroom_name=class_name,
            metrics_summary=StudentMetricsSummary(
                avg_focus_score=round(avg_focus, 2),
                avg_distracted_score=round(avg_distracted, 2),
                avg_raised_hand_count=round(avg_raised_hand, 2),
                total_raised_hand_count=int(sum_raised_hand)
            )
        )

    @staticmethod
    def get_student_sessions(
        db: Session, student_id: uuid.UUID, page: int, size: int, search: Optional[str] = None
    ) -> Tuple[List[StudentSessionRead], int]:
        student = StudentRepository.get_by_id(db, student_id)
        if not student:
            raise NotFoundException("Student tidak ditemukan")

        page = max(1, page)
        skip = (page - 1) * size
        items, total = StudentRepository.get_student_sessions(db, student_id, skip, size, search)
        result = []

        for session, teacher_name, focus, distracted, raised_hand in items:
            result.append(
                StudentSessionRead(
                    session_id=session.id,
                    subject=session.subject,
                    start_time=session.start_time,
                    end_time=session.end_time,
                    teacher_name=teacher_name,
                    metrics={
                        "focus_score": round(focus, 2),
                        "distracted_score": round(distracted, 2),
                        "raised_hand_count": raised_hand
                    }
                )
            )
            
        return result, total
