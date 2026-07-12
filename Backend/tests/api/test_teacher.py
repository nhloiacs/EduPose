import pytest
import io
import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.core.auth_deps import require_principal
from app.database.database import get_db
from starlette.datastructures import UploadFile
from app.models.classroom import Classroom
from app.models.classroom_session import ClassroomSession
from app.models.classroom_metric import ClassroomMetric

def create_api_file():
    return ("file", ("test.jpg", io.BytesIO(b"fake-image"), "image/jpeg"))

def create_service_file():
    return UploadFile(filename="test.jpg", file=io.BytesIO(b"fake-image"))

def setup_test_classroom(db):
    classroom = Classroom(name=f"Room-{uuid.uuid4().hex[:4]}")
    db.add(classroom)
    db.commit()
    db.refresh(classroom)
    return classroom

def setup_test_session(db, teacher_id, classroom_id, subject="Fisika Dasar"):
    session = ClassroomSession(teacher_id=teacher_id, classroom_id=classroom_id, subject=subject)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session

def setup_test_metric(db, session_id, focus=85.0, active=30, phone=2, raised=5):
    metric = ClassroomMetric(
        session_id=session_id,
        focus_percentage=focus,
        active_students=active,
        using_phone_count=phone,
        raised_hand_count=raised
    )
    db.add(metric)
    db.commit()
    return metric

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
    from app.modules.teacher.service import TeacherService
    from app.modules.teacher.schema import TeacherCreate
    uid = uuid.uuid4().hex[:6]
    data = TeacherCreate(name="Budi", nip=f"123{uid}", email=f"budi{uid}@sekolah.com", role="teacher", password="123")
    teacher = TeacherService.create_teacher(db_session, data, create_service_file())
    response = client.get(f"/teachers/{teacher.id}/edit")
    assert response.status_code == 200
    assert response.json()["data"]["name"] == "Budi"

def test_update_teacher_api(client, db_session):
    from app.modules.teacher.service import TeacherService
    from app.modules.teacher.schema import TeacherCreate
    
    uid = uuid.uuid4().hex[:6]
    data = TeacherCreate(name="Ani", nip=f"456{uid}", email=f"ani{uid}@sekolah.com", role="teacher", password="123")
    teacher = TeacherService.create_teacher(db_session, data, create_service_file())
    
    update_data = {"name": "Ani Updated"}
    response = client.patch(f"/teachers/{teacher.id}", data=update_data)
    
    assert response.status_code == 200
    assert response.json()["data"]["name"] == "Ani Updated"

def test_delete_teacher_api(client, db_session):
    from app.modules.teacher.service import TeacherService
    from app.modules.teacher.schema import TeacherCreate
    
    uid = uuid.uuid4().hex[:6]
    data = TeacherCreate(name="Budi Del", nip=f"789{uid}", email=f"del{uid}@sekolah.com", role="teacher", password="123")
    teacher = TeacherService.create_teacher(db_session, data, create_service_file())
    
    response = client.delete(f"/teachers/{teacher.id}")
    assert response.status_code == 200
    assert response.json()["message"] == "Teacher deleted successfully"

def test_get_teacher_detail_with_metrics_api(client, db_session):
    from app.modules.teacher.service import TeacherService
    from app.modules.teacher.schema import TeacherCreate
    uid = uuid.uuid4().hex[:6]
    data = TeacherCreate(name="Pak Guru Detail", nip=f"NIP-{uid}", email=f"detail{uid}@sekolah.com", role="teacher", password="123")
    teacher = TeacherService.create_teacher(db_session, data, create_service_file())
    classroom = setup_test_classroom(db_session)
    session = setup_test_session(db_session, teacher.id, classroom.id, subject="Biologi")
    setup_test_metric(db_session, session.id, focus=90.0, active=40, phone=1, raised=10)
    response = client.get(f"/teachers/{teacher.id}")
    assert response.status_code == 200
    json_data = response.json()["data"]
    assert json_data["name"] == "Pak Guru Detail"
    assert "metrics_summary" in json_data
    assert json_data["metrics_summary"]["avg_focus_percentage"] == 90.0
    assert json_data["metrics_summary"]["avg_active_students"] == 40.0

def test_list_teacher_sessions_api(client, db_session):
    from app.modules.teacher.service import TeacherService
    from app.modules.teacher.schema import TeacherCreate
    uid = uuid.uuid4().hex[:6]
    data = TeacherCreate(name="Bu Guru Sesi", nip=f"NIP-{uid}", email=f"sesi{uid}@sekolah.com", role="teacher", password="123")
    teacher = TeacherService.create_teacher(db_session, data, create_service_file())
    classroom = setup_test_classroom(db_session)
    session1 = setup_test_session(db_session, teacher.id, classroom.id, subject="Matematika")
    setup_test_metric(db_session, session1.id, focus=85.0)
    response = client.get(f"/teachers/{teacher.id}/sessions?search=Matematika")
    assert response.status_code == 200
    items = response.json()["data"]["items"]
    assert len(items) == 1
    assert items[0]["subject"] == "Matematika"
    assert items[0]["metrics"]["focus_percentage"] == 85.0
