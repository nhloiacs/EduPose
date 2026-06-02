import uuid

from sqlalchemy.orm import Session

from app.core.security import (
    hash_password,
    verify_password,
    create_access_token
)

from app.models.user import User
from app.repositories.user_repository import UserRepository


class AuthService:

    @staticmethod
    def register(
        db: Session,
        name: str,
        email: str,
        password: str
    ):
        existing_user = (
            UserRepository.get_by_email(
                db,
                email
            )
        )

        if existing_user:
            raise Exception(
                "Email already registered"
            )

        user = User(
            id=str(uuid.uuid4()),
            name=name,
            email=email,
            password_hash=hash_password(
                password
            ),
            role="TEACHER"
        )

        return UserRepository.create(
            db,
            user
        )

    @staticmethod
    def login(
        db: Session,
        email: str,
        password: str
    ):
        user = (
            UserRepository.get_by_email(
                db,
                email
            )
        )

        if not user:
            raise Exception(
                "Invalid credentials"
            )

        if not verify_password(
            password,
            user.password_hash
        ):
            raise Exception(
                "Invalid credentials"
            )

        token = create_access_token(
            {
                "sub": str(user.id),
                "email": user.email,
                "role": user.role
            }
        )

        return token