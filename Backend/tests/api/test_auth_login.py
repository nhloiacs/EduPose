import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database.database import get_db
from app.models.teacher import Teacher
from app.core.security import hash_password

@pytest.fixture
def client(db_session):
    def _get_test_db():
        yield db_session
    
    app.dependency_overrides[get_db] = _get_test_db
    
    with TestClient(app) as c:
        yield c
    
    app.dependency_overrides.clear()

@pytest.fixture
def test_teacher(db_session):
    password = "password123"
    teacher = Teacher(
        name="Test Teacher",
        email="test@sekolah.com",
        password_hash=hash_password(password),
        role="teacher"
    )
    db_session.add(teacher)
    db_session.commit()
    yield teacher
    db_session.delete(teacher)
    db_session.commit()

def test_login_success(client, test_teacher):
    payload = {"email": "test@sekolah.com", "password": "password123"}
    response = client.post("/auth/login", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    assert "token" in data
    assert isinstance(data["token"], str)

def test_login_wrong_password(client, test_teacher):
    payload = {"email": "test@sekolah.com", "password": "salah_bang"}
    response = client.post("/auth/login", json=payload)
    
    assert response.status_code == 401
    assert "Invalid credentials" in response.json()["detail"]

def test_login_invalid_email(client):
    payload = {"email": "gaada@sekolah.com", "password": "password123"}
    response = client.post("/auth/login", json=payload)
    
    assert response.status_code == 401
    assert "Invalid credentials" in response.json()["detail"]

def test_login_invalid_schema(client):
    payload = {"email": "bukan-email", "password": "password123"}
    response = client.post("/auth/login", json=payload)
    
    assert response.status_code == 422