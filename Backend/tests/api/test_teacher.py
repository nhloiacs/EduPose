import pytest
import io
import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.core.auth_deps import require_principal
from app.database.database import get_db
from starlette.datastructures import UploadFile

def create_api_file():
    return ("file", ("test.jpg", io.BytesIO(b"fake-image"), "image/jpeg"))

def create_service_file():
    return UploadFile(filename="test.jpg", file=io.BytesIO(b"fake-image"))

@pytest.fixture
def client(db_session):
    def _get_test_db():
        yield db_session
    app.dependency_overrides[get_db] = _get_test_db
    app.dependency_overrides[require_principal] = lambda: {"sub": "admin-id", "role": "principal"}
    
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

def test_create_teacher_api(client):
    uid = uuid.uuid4().hex[:6]
    data = {
        "name": f"Jojo {uid}",
        "email": f"jojo{uid}@sekolah.com",
        "role": "teacher",
        "password": "password123",
        "nip": f"NIP-{uid}"
    }
    response = client.post("/teachers/", data=data, files=[create_api_file()])
    assert response.status_code == 200
    assert response.json()["message"] == "Teacher created successfully"

def test_get_teacher_detail_api(client, db_session):
    from app.services.teacher_service import TeacherService
    from app.schemas.teacher import TeacherCreate
    uid = uuid.uuid4().hex[:6]
    data = TeacherCreate(name="Budi", nip=f"123{uid}", email=f"budi{uid}@sekolah.com", role="teacher", password="123")
    teacher = TeacherService.create_teacher(db_session, data, create_service_file())
    response = client.get(f"/teachers/{teacher.id}")
    assert response.status_code == 200
    assert response.json()["data"]["name"] == "Budi"

def test_update_teacher_api(client, db_session):
    from app.services.teacher_service import TeacherService
    from app.schemas.teacher import TeacherCreate
    
    uid = uuid.uuid4().hex[:6]
    data = TeacherCreate(name="Ani", nip=f"456{uid}", email=f"ani{uid}@sekolah.com", role="teacher", password="123")
    teacher = TeacherService.create_teacher(db_session, data, create_service_file())
    
    update_data = {"name": "Ani Updated"}
    response = client.patch(f"/teachers/{teacher.id}", data=update_data)
    
    assert response.status_code == 200
    assert response.json()["data"]["name"] == "Ani Updated"

def test_delete_teacher_api(client, db_session):
    from app.services.teacher_service import TeacherService
    from app.schemas.teacher import TeacherCreate
    
    uid = uuid.uuid4().hex[:6]
    data = TeacherCreate(name="Budi Del", nip=f"789{uid}", email=f"del{uid}@sekolah.com", role="teacher", password="123")
    teacher = TeacherService.create_teacher(db_session, data, create_service_file())
    
    response = client.delete(f"/teachers/{teacher.id}")
    assert response.status_code == 200
    assert response.json()["message"] == "Teacher deleted successfully"