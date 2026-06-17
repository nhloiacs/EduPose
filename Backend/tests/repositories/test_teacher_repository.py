import pytest
from app.models.teacher import Teacher
from app.repositories.teacher_repository import TeacherRepository

def test_get_by_email_success(db_session):
    dummy_teacher = Teacher(
        name="Pak Guru Budi",
        email="budi@sekolah.com",
        password_hash="hashed_password_123",
        role="teacher",
        is_active=True
    )
    db_session.add(dummy_teacher)
    db_session.commit()

    result = TeacherRepository.get_by_email(db=db_session, email="budi@sekolah.com")

    assert result is not None
    assert result.email == "budi@sekolah.com"
    
    db_session.delete(dummy_teacher)
    db_session.commit()

def test_get_by_email_not_found(db_session):
    result = TeacherRepository.get_by_email(db=db_session, email="tidak.ada@sekolah.com")

    assert result is None