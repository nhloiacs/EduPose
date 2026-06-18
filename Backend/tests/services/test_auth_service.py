import pytest
from app.services.auth_service import AuthService
from app.models.teacher import Teacher
from app.core.security import hash_password
from app.core.exceptions import UnauthorizedException

@pytest.fixture
def test_teacher(db_session):
    password = "password123"
    teacher = Teacher(
        name="Test Teacher",
        email="test@sekolah.com",
        password_hash=hash_password(password),
        photo_filepath="/static/images/profiles/profile.png",
        role="teacher"
    )
    db_session.add(teacher)
    db_session.commit()
    db_session.refresh(teacher)
    
    yield teacher
    
    db_session.delete(teacher)
    db_session.commit()

def test_login_success(db_session, test_teacher):
    result = AuthService.login(db_session, "test@sekolah.com", "password123")
    
    assert result["token"] is not None
    assert isinstance(result["token"], str)
    assert result["name"] == "Test Teacher"
    assert result["email"] == "test@sekolah.com"
    assert result["role"] == "teacher"
    assert result["photo_filepath"] == "/static/images/profiles/profile.png"

def test_login_invalid_email(db_session):
    with pytest.raises(UnauthorizedException, match="Invalid credentials"):
        AuthService.login(db_session, "tidak.ada@sekolah.com", "random_password")

def test_login_wrong_password(db_session, test_teacher):
    with pytest.raises(UnauthorizedException, match="Invalid credentials"):
        AuthService.login(db_session, "test@sekolah.com", "password_salah_bang")