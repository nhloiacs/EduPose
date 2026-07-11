import pytest
import io
import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.core.auth_deps import require_principal
from app.database.database import get_db
from app.modules.classroom.service import ClassroomService
from app.models.classroom_session import ClassroomSession
from app.models.classroom_metric import ClassroomMetric
from app.models.student import Student
from app.modules.classroom.schema import ClassroomCreate

@pytest.fixture
def client(db_session):
    def _get_test_db():
        yield db_session
    app.dependency_overrides[get_db] = _get_test_db    
    app.dependency_overrides[require_principal] = lambda: {"sub": "admin-id", "role": "principal"}
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

def create_api_file():
    return ("file", ("test.jpg", io.BytesIO(b"fake-image"), "image/jpeg"))

def create_test_session(db, classroom_id):
    session = ClassroomSession(classroom_id=classroom_id, subject="Matematika")
    db.add(session)
    db.commit()
    return session

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
    assert response.json()["data"]["name"] == f"Jojo {uid}"

def test_list_teachers_api(client):
    response = client.get("/teachers/?page=1&size=10")
    assert response.status_code == 200
    assert "items" in response.json()["data"]

def test_get_teacher_detail_api(client, db_session):
    from app.modules.teacher.service import TeacherService
    from app.modules.teacher.schema import TeacherCreate
    from starlette.datastructures import UploadFile
    uid = uuid.uuid4().hex[:6]
    data = TeacherCreate(name="Budi", nip=f"123{uid}", email=f"budi{uid}@sekolah.com", role="teacher", password="123")
    teacher = TeacherService.create_teacher(db_session, data, UploadFile(filename="t.jpg", file=io.BytesIO(b"x")))    
    response = client.get(f"/teachers/{teacher.id}/edit")
    assert response.status_code == 200
    assert response.json()["data"]["name"] == "Budi"

def test_update_teacher_api(client, db_session):
    from app.modules.teacher.service import TeacherService
    from app.modules.teacher.schema import TeacherCreate
    from starlette.datastructures import UploadFile
    uid = uuid.uuid4().hex[:6]
    data = TeacherCreate(name="Ani", nip=f"456{uid}", email=f"ani{uid}@sekolah.com", role="teacher", password="123")
    teacher = TeacherService.create_teacher(db_session, data, UploadFile(filename="t.jpg", file=io.BytesIO(b"x")))
    update_data = {"name": "Ani Updated"}
    response = client.patch(f"/teachers/{teacher.id}", data=update_data)
    assert response.status_code == 200
    assert response.json()["data"]["name"] == "Ani Updated"

def test_delete_teacher_api(client, db_session):
    from app.modules.teacher.service import TeacherService
    from app.modules.teacher.schema import TeacherCreate
    from starlette.datastructures import UploadFile
    uid = uuid.uuid4().hex[:6]
    data = TeacherCreate(name="Budi Del", nip=f"789{uid}", email=f"del{uid}@sekolah.com", role="teacher", password="123")
    teacher = TeacherService.create_teacher(db_session, data, UploadFile(filename="t.jpg", file=io.BytesIO(b"x")))
    response = client.delete(f"/teachers/{teacher.id}")
    assert response.status_code == 200
    assert response.json()["message"] == "Teacher deleted successfully"

def test_create_classroom_api(client):
    data = {"name": f"Room-{uuid.uuid4().hex[:4]}"}
    response = client.post("/classrooms/", json=data)
    assert response.status_code == 200
    assert response.json()["message"] == "Classroom created successfully"
    assert response.json()["data"]["name"] == data["name"]

def test_list_classrooms_api(client):
    response = client.get("/classrooms/?page=1&size=10")
    assert response.status_code == 200
    assert "items" in response.json()["data"]

def test_get_classroom_detail_api(client, db_session):
    data = ClassroomCreate(name=f"Room-{uuid.uuid4().hex[:4]}")
    classroom = ClassroomService.create_classroom(db_session, data)
    response = client.get(f"/classrooms/{classroom.id}/edit")
    assert response.status_code == 200
    assert response.json()["data"]["name"] == data.name

def test_update_classroom_api(client, db_session):
    data = ClassroomCreate(name=f"Room-{uuid.uuid4().hex[:4]}")
    classroom = ClassroomService.create_classroom(db_session, data)
    new_name = f"New Name {uuid.uuid4().hex[:6]}" 
    update_data = {"name": new_name}
    response = client.patch(f"/classrooms/{classroom.id}", json=update_data)
    assert response.status_code == 200
    assert response.json()["data"]["name"] == new_name

def test_delete_classroom_api(client, db_session):
    data = ClassroomCreate(name=f"Room-{uuid.uuid4().hex[:4]}") 
    classroom = ClassroomService.create_classroom(db_session, data)
    response = client.delete(f"/classrooms/{classroom.id}")
    assert response.status_code == 200
    assert response.json()["message"] == "Classroom deleted successfully"

def test_get_classroom_metrics_detail_api(client, db_session):
    data = ClassroomCreate(name=f"Room-{uuid.uuid4().hex[:4]}") 
    classroom = ClassroomService.create_classroom(db_session, data)
    session = create_test_session(db_session, classroom.id)
    metric = ClassroomMetric(
        session_id=session.id, 
        focus_percentage=80.0, 
        active_students=10
    )
    db_session.add(metric)
    db_session.commit()
    response = client.get(f"/classrooms/{classroom.id}")
    assert response.status_code == 200
    metrics = response.json()["data"]["metrics_summary"]
    assert metrics["avg_focus_percentage"] == 80.0

def test_get_classroom_sessions_api(client, db_session):
    data = ClassroomCreate(name=f"Room-{uuid.uuid4().hex[:4]}") 
    classroom = ClassroomService.create_classroom(db_session, data)
    create_test_session(db_session, classroom.id)
    response = client.get(f"/classrooms/{classroom.id}/sessions")
    assert response.status_code == 200
    items = response.json()["data"]["items"]
    assert len(items) == 1
    assert items[0]["subject"] == "Matematika"

def test_get_classroom_students_api(client, db_session):
    data = ClassroomCreate(name=f"Student Room {uuid.uuid4().hex[:4]}")
    classroom = ClassroomService.create_classroom(db_session, data)
    unique_nis = f"NIS-{uuid.uuid4().hex[:6]}"
    student = Student(name="Budi", nis=unique_nis, classroom_id=classroom.id)
    db_session.add(student)
    db_session.commit()
    response = client.get(f"/classrooms/{classroom.id}/students")
    assert response.status_code == 200
    items = response.json()["data"]["items"]
    assert any(item["nis"] == unique_nis for item in items)
