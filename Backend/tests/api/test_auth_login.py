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
        photo_filepath="/static/images/teachers/profile.png",
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
    json_data = response.json()
    assert "data" in json_data
    assert "token" in json_data["data"]
    assert json_data["data"]["name"] == "Test Teacher"
    assert json_data["data"]["email"] == "test@sekolah.com"
    assert json_data["data"]["photo_filepath"] == "/static/images/teachers/profile.png"

def test_login_wrong_password(client, test_teacher):
    payload = {"email": "test@sekolah.com", "password": "salah_bang"}
    response = client.post("/auth/login", json=payload)
    assert response.status_code == 401
    assert "Invalid credentials" in response.json()["message"]

def test_login_invalid_email(client):
    payload = {"email": "gaada@sekolah.com", "password": "password123"}
    response = client.post("/auth/login", json=payload)
    assert response.status_code == 401
    assert "Invalid credentials" in response.json()["message"]

def test_login_invalid_schema(client):
    payload = {"email": "bukan-email", "password": "password123"}
    response = client.post("/auth/login", json=payload)
    assert response.status_code == 422