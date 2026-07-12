import pytest
import uuid
from app.models.classroom import Classroom
from app.models.classroom_session import ClassroomSession
from app.models.classroom_metric import ClassroomMetric
from app.models.student import Student
from app.models.student_metric import StudentMetric
from fastapi.testclient import TestClient
from app.main import app
from app.core.auth_deps import require_principal
from app.database.database import get_db

@pytest.fixture
def client(db_session):
    def _get_test_db():
        yield db_session
    app.dependency_overrides[get_db] = _get_test_db    
    app.dependency_overrides[require_principal] = lambda: {"sub": "admin-id", "role": "principal"}
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

def setup_test_classroom(db):
    classroom = Classroom(name=f"Room-{uuid.uuid4().hex[:4]}")
    db.add(classroom)
    db.commit()
    db.refresh(classroom)
    return classroom

def setup_test_session(db, classroom_id, subject="Sosiologi"):
    session = ClassroomSession(classroom_id=classroom_id, subject=subject)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session

def test_list_sessions_api(client, db_session):
    classroom = setup_test_classroom(db_session)
    session = setup_test_session(db_session, classroom.id, subject="Sosiologi")
    metric = ClassroomMetric(
        session_id=session.id, 
        focus_percentage=80.0, 
        active_students=20,
        using_phone_count=1,
        raised_hand_count=2
    )
    db_session.add(metric)
    db_session.commit()
    response = client.get("/classroom-sessions/?page=1&size=10")
    assert response.status_code == 200
    data = response.json()["data"]
    assert "items" in data
    assert len(data["items"]) >= 1
    first_item = data["items"][0]
    assert "metrics_summary" in first_item
    assert first_item["metrics_summary"]["avg_focus_percentage"] == 80.0
    assert first_item["metrics_summary"]["avg_active_students"] == 20.0
    assert first_item["metrics_summary"]["total_using_phone"] == 1
    assert first_item["metrics_summary"]["total_raised_hand"] == 2

def test_get_session_edit_api(client, db_session):
    classroom = setup_test_classroom(db_session)
    session = setup_test_session(db_session, classroom.id, subject="Ekonomi")
    response = client.get(f"/classroom-sessions/{session.id}/edit")
    assert response.status_code == 200
    assert response.json()["data"]["subject"] == "Ekonomi"
    assert "metrics_summary" not in response.json()["data"]

def test_get_session_detail_api(client, db_session):
    classroom = setup_test_classroom(db_session)
    session = setup_test_session(db_session, classroom.id, subject="Biologi")
    metric = ClassroomMetric(
        session_id=session.id, 
        focus_percentage=85.0, 
        active_students=30,
        using_phone_count=2,
        raised_hand_count=5
    )
    db_session.add(metric)
    db_session.commit()
    response = client.get(f"/classroom-sessions/{session.id}")
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["subject"] == "Biologi"
    assert data["metrics_summary"]["avg_focus_percentage"] == 85.0
    assert data["metrics_summary"]["total_raised_hand"] == 5

def test_update_session_api(client, db_session):
    classroom = setup_test_classroom(db_session)
    session = setup_test_session(db_session, classroom.id, subject="Old Subject")
    update_data = {"subject": "New Subject"}
    response = client.patch(f"/classroom-sessions/{session.id}", json=update_data)
    assert response.status_code == 200
    assert response.json()["data"]["subject"] == "New Subject"

def test_delete_session_api(client, db_session):
    classroom = setup_test_classroom(db_session)
    session = setup_test_session(db_session, classroom.id)
    response = client.delete(f"/classroom-sessions/{session.id}")
    assert response.status_code == 200
    assert response.json()["message"] == "Session deleted successfully"
    check_response = client.get(f"/classroom-sessions/{session.id}")
    assert check_response.status_code == 404

def test_get_session_students_api(client, db_session):
    classroom = setup_test_classroom(db_session)
    session = setup_test_session(db_session, classroom.id)
    unique_nis = f"NIS-{uuid.uuid4().hex[:6]}"
    student = Student(name="Joko", nis=unique_nis, classroom_id=classroom.id)
    db_session.add(student)
    db_session.commit()
    db_session.refresh(student)
    metric = StudentMetric(
        session_id=session.id,
        student_id=student.id,
        focus_score=92.5,
        distracted_score=7.5,
        raised_hand_count=2
    )
    db_session.add(metric)
    db_session.commit()
    response = client.get(f"/classroom-sessions/{session.id}/students")
    assert response.status_code == 200
    items = response.json()["data"]["items"]
    assert len(items) == 1
    assert items[0]["student_name"] == "Joko"
    assert items[0]["student_nis"] == unique_nis
    assert items[0]["focus_score"] == 92.5
