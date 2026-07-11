import pytest
import io
import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.core.auth_deps import require_principal
from app.database.database import get_db
from app.models.classroom import Classroom
from app.models.classroom_session import ClassroomSession
from app.models.student_metric import StudentMetric

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
    from app.modules.student.service import StudentService
    from app.modules.student.schema import StudentCreate
    classroom = create_test_classroom(db_session)
    uid = uuid.uuid4().hex[:6]
    data = StudentCreate(name="Budi", nis=f"NIS-{uid}", classroom_id=classroom.id)
    student = StudentService.create_student(db_session, data, create_service_file())
    response = client.get(f"/students/{student.id}")
    assert response.status_code == 200
    assert response.json()["data"]["name"] == "Budi"

def test_update_student_api(client, db_session):
    from app.modules.student.service import StudentService
    from app.modules.student.schema import StudentCreate
    classroom = create_test_classroom(db_session)
    uid = uuid.uuid4().hex[:6]
    data = StudentCreate(name="Ani", nis=f"NIS-{uid}", classroom_id=classroom.id)
    student = StudentService.create_student(db_session, data, create_service_file())
    update_data = {"name": "Ani Updated"}
    response = client.patch(f"/students/{student.id}", data=update_data)
    assert response.status_code == 200
    assert response.json()["data"]["name"] == "Ani Updated"

def test_delete_student_api(client, db_session):
    from app.modules.student.service import StudentService
    from app.modules.student.schema import StudentCreate
    classroom = create_test_classroom(db_session)
    uid = uuid.uuid4().hex[:6]
    data = StudentCreate(name="Budi Del", nis=f"NIS-{uid}", classroom_id=classroom.id)
    student = StudentService.create_student(db_session, data, create_service_file())
    response = client.delete(f"/students/{student.id}")
    assert response.status_code == 200
    assert response.json()["message"] == "Student deleted successfully"

def test_get_student_detail_with_metrics_api(client, db_session):
    from app.modules.student.service import StudentService
    from app.modules.student.schema import StudentCreate
    classroom = create_test_classroom(db_session)
    data = StudentCreate(name="Budi Metrik", nis=f"NIS-{uuid.uuid4().hex[:4]}", classroom_id=classroom.id)
    student = StudentService.create_student(db_session, data, create_service_file())
    session = ClassroomSession(classroom_id=classroom.id, subject="Test Subject")
    db_session.add(session)
    db_session.commit()
    metric = StudentMetric(session_id=session.id, student_id=student.id, focus_score=90.0, raised_hand_count=2)
    db_session.add(metric)
    db_session.commit()
    response = client.get(f"/students/{student.id}/detail")
    assert response.status_code == 200
    json_data = response.json()["data"]
    assert json_data["name"] == "Budi Metrik"
    assert json_data["metrics_summary"]["avg_focus_score"] == 90.0
    assert json_data["metrics_summary"]["total_raised_hand_count"] == 2

def test_list_student_sessions_api(client, db_session):
    from app.modules.student.service import StudentService
    from app.modules.student.schema import StudentCreate
    classroom = create_test_classroom(db_session)
    data = StudentCreate(name="Budi Sesi", nis=f"NIS-{uuid.uuid4().hex[:4]}", classroom_id=classroom.id)
    student = StudentService.create_student(db_session, data, create_service_file())
    s1 = ClassroomSession(classroom_id=classroom.id, subject="Matematika")
    s2 = ClassroomSession(classroom_id=classroom.id, subject="Sejarah")
    db_session.add_all([s1, s2])
    db_session.commit()
    m1 = StudentMetric(session_id=s1.id, student_id=student.id, focus_score=80.0)
    db_session.add(m1)
    db_session.commit()
    response = client.get(f"/students/{student.id}/sessions?search=Matematika")
    assert response.status_code == 200
    items = response.json()["data"]["items"]
    assert len(items) == 1
    assert items[0]["subject"] == "Matematika"
    response_all = client.get(f"/students/{student.id}/sessions?page=1&size=10")
    assert response_all.status_code == 200
    assert len(response_all.json()["data"]["items"]) == 1
