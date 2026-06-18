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


class TeacherService:
    UPLOAD_DIR = Path("app/static/images/profiles")
    ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif"}

    @staticmethod
    def _save_file(file: UploadFile) -> str:
        """
        Helper method untuk menyimpan file upload secara aman dengan nama unik.
        Mengembalikan path relatif untuk disimpan di database.
        """
        if not file.filename:
            raise HTTPException(status_code=400, detail="Nama file tidak valid")

        file_extension = Path(file.filename).suffix.lower()
        if file_extension not in TeacherService.ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400, 
                detail=f"Tipe file tidak diizinkan. Hanya {', '.join(TeacherService.ALLOWED_EXTENSIONS)}"
            )
        TeacherService.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = TeacherService.UPLOAD_DIR / unique_filename

        try:
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Gagal menyimpan file: {str(e)}")

        return f"/static/images/profiles/{unique_filename}"

    @staticmethod
    def _delete_file(photo_filepath: str) -> None:
        """Helper method untuk menghapus file lama jika ada."""
        if not photo_filepath:
            return
            
        try:
            relative_path = photo_filepath.lstrip("/")
            file_path = Path("app") / relative_path
            
            if file_path.exists():
                os.remove(file_path)
        except Exception:
            pass

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

        photo_url = TeacherService._save_file(file)
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
            TeacherService._delete_file(teacher.photo_filepath)
            update_data["photo_filepath"] = TeacherService._save_file(file)

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