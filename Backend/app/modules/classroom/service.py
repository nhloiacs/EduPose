import uuid
from typing import Optional, Tuple, List, Any
from sqlalchemy.orm import Session
from app.core.exceptions import ConflictException, NotFoundException
from app.modules.classroom.repository import ClassroomRepository
from app.modules.classroom.schema import (
    ClassroomCreate, ClassroomSessionRead, SessionMetric, 
    ClassroomDetailResponse, ClassroomMetricsSummary, 
    ClassroomStudentRead, ClassroomSelectRead
)

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

    @staticmethod
    def get_classroom_detail(db: Session, classroom_id: uuid.UUID) -> ClassroomDetailResponse:
        result = ClassroomRepository.get_detail_with_avg_metrics(db, classroom_id)
        if not result: raise NotFoundException("Classroom tidak ditemukan")
        cls, f, a, p, r = result
        return ClassroomDetailResponse(
            id=cls.id, 
            name=cls.name, 
            metrics_summary=ClassroomMetricsSummary(
                avg_focus_percentage=round(f, 2),
                avg_active_students=round(a, 2),
                avg_using_phone_count=round(p, 2),
                avg_raised_hand_count=round(r, 2)
            )
        )

    @staticmethod
    def get_sessions(db: Session, classroom_id: uuid.UUID, page: int, size: int, search: Optional[str] = None) -> Tuple[List[ClassroomSessionRead], int]:
        page = max(1, page)
        skip = (page - 1) * size
        items, total = ClassroomRepository.get_sessions(db, classroom_id, skip, size, search)
        result = []
        for session, metric, teacher_name in items:
            metrics_data = SessionMetric(
                active_students=metric.active_students if metric else 0,
                focus_percentage=metric.focus_percentage if metric else 0.0,
                using_phone_count=metric.using_phone_count if metric else 0,
                raised_hand_count=metric.raised_hand_count if metric else 0
            )
            result.append(
                ClassroomSessionRead(
                    session_id=session.id,
                    subject=session.subject,
                    start_time=session.start_time,
                    end_time=session.end_time,
                    teacher_name=teacher_name,
                    metrics=metrics_data
                )
            )
        return result, total

    @staticmethod
    def get_students(db: Session, classroom_id: uuid.UUID, page: int, size: int, search: str = None):
        page = max(1, page)
        skip = (page - 1) * size
        items, total = ClassroomRepository.get_students(db, classroom_id, skip, size, search)
        student_list = [
            ClassroomStudentRead(
                id=s.id,
                name=s.name,
                nis=s.nis,
                photo_filepath=s.photo_filepath
            ) for s in items
        ]
        return student_list, total

    @staticmethod
    def get_classroom_options(db: Session, search: Optional[str] = None) -> List[ClassroomSelectRead]:
        items = ClassroomRepository.get_select_options(db, search)
        return [ClassroomSelectRead(id=i.id, name=i.name) for i in items]
