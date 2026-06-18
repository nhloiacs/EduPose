import uuid

from sqlalchemy.orm import Session
from app.core.exceptions import UnauthorizedException
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token
)

from app.models.teacher import Teacher
from app.repositories.teacher_repository import TeacherRepository

class AuthService:
    @staticmethod
    def login(db: Session, email: str, password: str):
        teacher = TeacherRepository.get_by_email(db, email)
        
        if not teacher or not verify_password(password, teacher.password_hash):
            raise UnauthorizedException("Invalid credentials")

        token = create_access_token({"sub": str(teacher.id), "role": teacher.role})
        
        return {
            "token": token,
            "name": teacher.name,
            "email": teacher.email,
            "role": teacher.role,
            "photo_filepath": teacher.photo_filepath
        }