import os
import shutil
import uuid
from pathlib import Path
from typing import Optional, Tuple, List, Any
from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session
from app.core.exceptions import ConflictException, NotFoundException
from app.core.security import hash_password
from app.repositories.teacher_repository import TeacherRepository
from app.schemas.teacher import TeacherCreate, TeacherUpdate
from app.utils.file_manager import FileManager

class TeacherService:
    UPLOAD_DIR = Path("app/static/images/profiles")

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