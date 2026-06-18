from sqlalchemy.orm import Session
from app.repositories.teacher_repository import TeacherRepository
from app.core.security import hash_password
from app.schemas.teacher import TeacherCreate, TeacherUpdate
from app.core.exceptions import ConflictException, NotFoundException
from typing import Optional
from fastapi import UploadFile
from pathlib import Path
import uuid
import shutil
import os

class TeacherService:
    @staticmethod
    def get_teacher_by_id(db: Session, teacher_id: uuid.UUID):
        teacher = TeacherRepository.get_by_id(db, teacher_id)
        if not teacher:
            raise NotFoundException("Teacher tidak ditemukan")
        return teacher

import shutil
import uuid
from pathlib import Path
from fastapi import UploadFile
from sqlalchemy.orm import Session
from app.core.security import hash_password
from app.core.exceptions import ConflictException
from app.repositories.teacher_repository import TeacherRepository
from app.schemas.teacher import TeacherCreate

class TeacherService:
    @staticmethod
    def create_teacher(db: Session, data: TeacherCreate, file: UploadFile):
        if TeacherRepository.get_by_email_or_nip(db, data.email, data.nip):
            raise ConflictException("Email atau NIP sudah terdaftar.")

        upload_dir = Path("app/static/images/profiles")
        upload_dir.mkdir(parents=True, exist_ok=True)

        file_extension = Path(file.filename).suffix
        unique_filename = f"{uuid.uuid4()}{file_extension}" 
        file_path = upload_dir / unique_filename

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        photo_url = f"/static/images/profiles/{unique_filename}"
        hashed = hash_password(data.password)

        deleted_teacher = TeacherRepository.get_soft_deleted(db, data.email, data.nip)
        
        if deleted_teacher:
            return TeacherRepository.reactivate_teacher(
                db=db, 
                teacher=deleted_teacher, 
                data=data, 
                hashed_pw=hashed, 
                photo_filepath=photo_url
            )

        return TeacherRepository.create(db, data, hashed, photo_url)

    @staticmethod
    def get_all_teachers(db: Session, page: int, size: int, search: Optional[str] = None):
        page = max(1, page)
        skip = (page - 1) * size
        
        items, total = TeacherRepository.get_all(db, skip, size, search)
        return items, total
            

    @staticmethod
    def update_teacher(db: Session, teacher_id: uuid.UUID, update_data: dict, file: Optional[UploadFile] = None):
        teacher = TeacherRepository.get_by_id(db, teacher_id)
        if not teacher:
            raise NotFoundException("Teacher tidak ditemukan")

        if file:
            upload_dir = Path("app/static/images/profiles")
            upload_dir.mkdir(parents=True, exist_ok=True)
            
            if teacher.photo_filepath and (Path("app") / teacher.photo_filepath.lstrip("/")).exists():
                os.remove(Path("app") / teacher.photo_filepath.lstrip("/"))

            file_extension = Path(file.filename).suffix
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            file_path = upload_dir / unique_filename
            
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)            
            update_data["photo_filepath"] = f"/static/images/profiles/{unique_filename}"

        if "email" in update_data and update_data["email"] != teacher.email:
            if TeacherRepository.get_by_email(db, update_data["email"]):
                raise ConflictException("Email sudah digunakan oleh teacher lain")
        return TeacherRepository.update(db, teacher, update_data)
    
    @staticmethod
    def delete_teacher(db: Session, teacher_id: str):
        teacher = TeacherRepository.soft_delete(db, teacher_id)
        if not teacher:
            raise NotFoundException("Teacher tidak ditemukan")
        return teacher