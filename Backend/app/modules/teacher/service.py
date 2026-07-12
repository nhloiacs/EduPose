import os
import shutil
import uuid
from pathlib import Path
from typing import Optional, Tuple, List, Any
from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session
from app.core.exceptions import ConflictException, NotFoundException
from app.core.security import hash_password
from app.modules.teacher.repository import TeacherRepository
from app.modules.teacher.schema import TeacherCreate, TeacherUpdate, TeacherDetailResponse, TeacherMetricsSummary, SessionMetricDetail, TeacherSessionRead
from app.utils.file_manager import FileManager

class TeacherService:
    UPLOAD_DIR = Path("static/images/teachers")

    @staticmethod
    def get_teacher_by_id(db: Session, teacher_id: uuid.UUID) -> Any:
        teacher = TeacherRepository.get_by_id(db, teacher_id)
        if not teacher:
            raise NotFoundException("Teacher tidak ditemukan")
        return teacher

    @staticmethod
    def create_teacher(db: Session, data: TeacherCreate, file: UploadFile) -> Any:
        if TeacherRepository.get_by_email_or_nip(db, data.email, data.nip):
            raise ConflictException("Email atau NIP sudah terdaftar.")

        photo_url = FileManager.save_file(file, TeacherService.UPLOAD_DIR)
        hashed_pw = hash_password(data.password)

        deleted_teacher = TeacherRepository.get_soft_deleted(db, data.email, data.nip)
        
        if deleted_teacher:
            return TeacherRepository.reactivate_teacher(
                db=db, 
                teacher=deleted_teacher, 
                data=data, 
                hashed_pw=hashed_pw, 
                photo_filepath=photo_url
            )

        return TeacherRepository.create(db, data, hashed_pw, photo_url)

    @staticmethod
    def get_all_teachers(db: Session, page: int, size: int, search: Optional[str] = None) -> Tuple[List[Any], int]:
        page = max(1, page)
        skip = (page - 1) * size
        items, total = TeacherRepository.get_all(db, skip, size, search)
        return items, total

    @staticmethod
    def update_teacher(db: Session, teacher_id: uuid.UUID, update_data: dict, file: Optional[UploadFile] = None) -> Any:
        teacher = TeacherRepository.get_by_id(db, teacher_id)
        if not teacher:
            raise NotFoundException("Teacher tidak ditemukan")

        if file:
            FileManager.delete_file(teacher.photo_filepath)
            update_data["photo_filepath"] = FileManager.save_file(file, TeacherService.UPLOAD_DIR)

        if "email" in update_data and update_data["email"] != teacher.email:
            if TeacherRepository.get_by_email(db, update_data["email"]):
                raise ConflictException("Email sudah digunakan oleh teacher lain")

        return TeacherRepository.update(db, teacher, update_data)

    @staticmethod
    def delete_teacher(db: Session, teacher_id: uuid.UUID) -> Any:
        teacher = TeacherRepository.soft_delete(db, teacher_id)
        if not teacher:
            raise NotFoundException("Teacher tidak ditemukan")
        return teacher   

    @staticmethod
    def get_teacher_detail(db: Session, teacher_id: uuid.UUID) -> TeacherDetailResponse:
        result = TeacherRepository.get_detail_with_avg_metrics(db, teacher_id)
        if not result:
            raise NotFoundException("Teacher tidak ditemukan")
        teacher, avg_focus, avg_active, avg_phone, avg_raised = result
        return TeacherDetailResponse(
            id=teacher.id,
            name=teacher.name,
            nip=teacher.nip,
            email=teacher.email,
            role=teacher.role,
            is_active=teacher.is_active,
            photo_filepath=teacher.photo_filepath,
            metrics_summary=TeacherMetricsSummary(
                avg_focus_percentage=round(avg_focus, 2),
                avg_active_students=round(avg_active, 2),
                avg_using_phone_count=round(avg_phone, 2),
                avg_raised_hand_count=round(avg_raised, 2)
            )
        )

    @staticmethod
    def get_teacher_sessions(db: Session, teacher_id: uuid.UUID, page: int, size: int, search: Optional[str] = None):
        teacher = TeacherRepository.get_by_id(db, teacher_id)
        if not teacher:
            raise NotFoundException("Teacher tidak ditemukan")

        page = max(1, page)
        skip = (page - 1) * size
        items, total = TeacherRepository.get_teacher_sessions(db, teacher_id, skip, size, search)
        result = []
        for session, metric, classroom_name in items:
            metrics_data = SessionMetricDetail(
                active_students=round(metric.active_students, 2) if metric else 0.0,
                focus_percentage=round(metric.focus_percentage, 2) if metric else 0.0,
                using_phone_count=metric.using_phone_count if metric else 0,
                raised_hand_count=metric.raised_hand_count if metric else 0
            )
            result.append(TeacherSessionRead(
                session_id=session.id,
                classroom_name=classroom_name,
                subject=session.subject,
                start_time=session.start_time,
                end_time=session.end_time,
                status=session.status,
                metrics=metrics_data
            ))
        return result, total
