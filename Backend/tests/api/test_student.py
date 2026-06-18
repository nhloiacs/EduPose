import pytest
import io
import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.core.auth_deps import require_principal
from app.database.database import get_db
from app.models.classroom import Classroom

@pytest.fixture
def client(db_session):
    def _get_test_db():
        yield db_session
    app.dependency_overrides[get_db] = _get_test_db    
    app.dependency_overrides[require_principal] = lambda: {"sub": "admin-id", "role": "principal"}
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

def create_test_classroom(db):
    classroom = Classroom(name=f"Room {uuid.uuid4().hex[:4]}")
    db.add(classroom)
    db.commit()
    db.refresh(classroom)
    return classroom

def create_api_file():
    return ("file", ("test.jpg", io.BytesIO(b"fake-image"), "image/jpeg"))

def create_service_file():
    from starlette.datastructures import UploadFile
    return UploadFile(filename="test.jpg", file=io.BytesIO(b"fake-image"))

def test_create_student_api(client, db_session):
    classroom = create_test_classroom(db_session)
    uid = uuid.uuid4().hex[:6]    
    data = {
        "name": f"Student {uid}",
        "nis": f"NIS-{uid}",
        "classroom_id": str(classroom.id)
    }
    response = client.post("/students/", data=data, files=[create_api_file()])
    assert response.status_code == 200
    assert response.json()["message"] == "Student created successfully"
    assert response.json()["data"]["name"] == f"Student {uid}"

def test_list_students_api(client):
    response = client.get("/students/?page=1&size=10")
    assert response.status_code == 200
    assert "items" in response.json()["data"]

def test_get_student_detail_api(client, db_session):
    from app.services.student_service import StudentService
    from app.schemas.student import StudentCreate
    classroom = create_test_classroom(db_session)
    uid = uuid.uuid4().hex[:6]
    data = StudentCreate(name="Budi", nis=f"NIS-{uid}", classroom_id=classroom.id)
    student = StudentService.create_student(db_session, data, create_service_file())
    response = client.get(f"/students/{student.id}")
    assert response.status_code == 200
    assert response.json()["data"]["name"] == "Budi"

def test_update_student_api(client, db_session):
    from app.services.student_service import StudentService
    from app.schemas.student import StudentCreate
    classroom = create_test_classroom(db_session)
    uid = uuid.uuid4().hex[:6]
    data = StudentCreate(name="Ani", nis=f"NIS-{uid}", classroom_id=classroom.id)
    student = StudentService.create_student(db_session, data, create_service_file())
    update_data = {"name": "Ani Updated"}
    response = client.patch(f"/students/{student.id}", data=update_data)
    assert response.status_code == 200
    assert response.json()["data"]["name"] == "Ani Updated"

def test_delete_student_api(client, db_session):
    from app.services.student_service import StudentService
    from app.schemas.student import StudentCreate
    classroom = create_test_classroom(db_session)
    uid = uuid.uuid4().hex[:6]
    data = StudentCreate(name="Budi Del", nis=f"NIS-{uid}", classroom_id=classroom.id)
    student = StudentService.create_student(db_session, data, create_service_file())
    response = client.delete(f"/students/{student.id}")
    assert response.status_code == 200
    assert response.json()["message"] == "Student deleted successfully"