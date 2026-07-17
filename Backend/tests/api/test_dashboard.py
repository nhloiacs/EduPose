import pytest
import uuid
from fastapi.testclient import TestClient
from datetime import date, datetime, timedelta
from typing import List
from app.main import app
from app.database.database import get_db
from app.core.auth_deps import require_principal_or_teacher
from app.modules.dashboard.service import DashboardService
from app.modules.dashboard.schema import Granularity, TopEntityTarget, TopSortBy
from app.models.student import Student
from app.models.classroom import Classroom
from app.models.teacher import Teacher
from app.models.classroom_session import ClassroomSession
from app.models.classroom_metric import ClassroomMetric
from app.models.student_metric import StudentMetric

@pytest.fixture
def client_principal(db_session):
    def _get_test_db():
        yield db_session
    app.dependency_overrides[get_db] = _get_test_db
    app.dependency_overrides[require_principal_or_teacher] = lambda: {"sub": str(uuid.uuid4()), "role": "principal"}
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

@pytest.fixture
def client_teacher(db_session):
    def _get_test_db():
        yield db_session
    app.dependency_overrides[get_db] = _get_test_db
    app.dependency_overrides[require_principal_or_teacher] = lambda: {"sub": "88888888-4444-4444-4444-121212121212", "role": "teacher"}
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

def test_principal_dashboard_api(client_principal):
    response = client_principal.get("/dashboard/")
    assert response.status_code == 200
    data = response.json()["data"]
    assert "total_students" in data
    assert "total_teachers" in data

def test_teacher_dashboard_api(client_teacher):
    response = client_teacher.get("/dashboard/")
    assert response.status_code == 200
    data = response.json()["data"]
    assert "metrics_summary" in data
    assert "total_classrooms" in data

def setup_teacher(db, name):
    uid = uuid.uuid4().hex[:4]
    teacher = Teacher(name=name, nip=f"NIP-{uid}", email=f"{uid}@s.com", password_hash="hash", role="teacher")
    db.add(teacher)
    db.commit()
    db.refresh(teacher)
    return teacher

def setup_classroom(db, name):
    classroom = Classroom(name=name, camera_id=None)
    db.add(classroom)
    db.commit()
    db.refresh(classroom)
    return classroom

def test_get_dashboard_principal_stats(db_session):
    t1 = setup_teacher(db_session, "Teacher A")
    c1 = setup_classroom(db_session, "Class 1A")
    c2 = setup_classroom(db_session, "Class 1B")
    s1 = Student(name="A", nis="N1", classroom_id=c1.id)
    s2 = Student(name="B", nis="N2", classroom_id=c1.id)
    s3 = Student(name="C", nis="N3", classroom_id=c2.id)
    db_session.add_all([s1, s2, s3])
    sess1 = ClassroomSession(classroom_id=c1.id, teacher_id=t1.id, subject="IPA")
    sess2 = ClassroomSession(classroom_id=c2.id, teacher_id=t1.id, subject="IPS")
    sess3 = ClassroomSession(classroom_id=c2.id, teacher_id=t1.id, subject="IPA")
    db_session.add_all([sess1, sess2, sess3])
    db_session.commit()
    data = DashboardService.get_dashboard_data(db_session, "principal", uuid.uuid4())
    assert data.total_students == 3
    assert data.total_classrooms == 2
    assert data.total_teachers == 1
    assert data.total_subjects == 2

def test_get_dashboard_teacher_stats(db_session):
    teacher = setup_teacher(db_session, "Target Teacher")
    classroom = setup_classroom(db_session, "Math Class")
    student = Student(name="Murid Diajar", nis="M-1", classroom_id=classroom.id)
    db_session.add(student)
    db_session.commit()
    db_session.refresh(student)
    session = ClassroomSession(classroom_id=classroom.id, teacher_id=teacher.id, subject="Kalkulus")
    db_session.add(session)
    db_session.commit()
    db_session.refresh(session)
    metric = ClassroomMetric(session_id=session.id, focus_percentage=90.0, active_students=10, using_phone_count=1, raised_hand_count=5)
    db_session.add(metric)
    db_session.commit()
    data = DashboardService.get_dashboard_data(db_session, "teacher", teacher.id)
    assert data.total_classrooms == 1
    assert data.total_students == 1
    assert data.total_subjects == 1
    assert data.metrics_summary.avg_focus_percentage == 90.0
    assert data.metrics_summary.total_raised_hand == 5

def test_get_metrics_daily(db_session):
    teacher = setup_teacher(db_session, "Metric Teacher")
    classroom = setup_classroom(db_session, "Metric Class")
    today = date.today()
    session = ClassroomSession(classroom_id=classroom.id, teacher_id=teacher.id, subject="Sejarah", start_time=datetime.now())
    db_session.add(session)
    db_session.commit()
    metric = ClassroomMetric(session_id=session.id, focus_percentage=85.5, active_students=30, using_phone_count=2, raised_hand_count=10)
    db_session.add(metric)
    db_session.commit()
    data = DashboardService.get_metrics(db_session, Granularity.DAILY, today - timedelta(days=1), today + timedelta(days=1), "principal", uuid.uuid4())
    assert len(data) == 1
    assert data[0].type == "daily"
    assert data[0].avg_focus_percentage == 85.5
    assert data[0].total_using_phone == 2

def test_get_top_performers_student(db_session):
    teacher = setup_teacher(db_session, "Top Teacher")
    classroom = setup_classroom(db_session, "Top Class")
    s1 = Student(name="Pintar", nis="T1", classroom_id=classroom.id)
    s2 = Student(name="Kurang", nis="T2", classroom_id=classroom.id)
    db_session.add_all([s1, s2])
    db_session.commit()
    session = ClassroomSession(classroom_id=classroom.id, teacher_id=teacher.id, subject="Fisika")
    db_session.add(session)
    db_session.commit()
    sm1 = StudentMetric(session_id=session.id, student_id=s1.id, focus_score=95.0, raised_hand_count=10)
    sm2 = StudentMetric(session_id=session.id, student_id=s2.id, focus_score=50.0, raised_hand_count=1)
    db_session.add_all([sm1, sm2])
    db_session.commit()
    data = DashboardService.get_top_performers(db_session, TopEntityTarget.STUDENT, limit=2, sort_by=TopSortBy.FOCUS, role="principal", uid=uuid.uuid4())
    assert len(data) == 2
    assert data[0].name == "Pintar"
    assert data[0].avg_focus_percentage == 95.0
    assert data[1].name == "Kurang"

def test_get_dashboard_warnings_classroom(db_session):
    teacher = setup_teacher(db_session, "Warn Teacher")
    c_good = setup_classroom(db_session, "Good Class")
    c_bad = setup_classroom(db_session, "Bad Class")
    sess_good = ClassroomSession(classroom_id=c_good.id, teacher_id=teacher.id, subject="Kimia")
    sess_bad = ClassroomSession(classroom_id=c_bad.id, teacher_id=teacher.id, subject="Kimia")
    db_session.add_all([sess_good, sess_bad])
    db_session.commit()
    metric_good = ClassroomMetric(session_id=sess_good.id, focus_percentage=80.0, raised_hand_count=5)
    metric_bad = ClassroomMetric(session_id=sess_bad.id, focus_percentage=40.0, raised_hand_count=0)
    db_session.add_all([metric_good, metric_bad])
    db_session.commit()
    data = DashboardService.get_dashboard_warnings(db_session, TopEntityTarget.CLASSROOM, threshold=50.0, role="principal", uid=uuid.uuid4())
    assert len(data) == 1
    assert data[0].name == "Bad Class"
    assert data[0].avg_focus_percentage == 40.0

def test_get_dashboard_warnings_teacher_role_filter(db_session):
    teacher = setup_teacher(db_session, "Teacher Filter")
    classroom = setup_classroom(db_session, "Filter Class")
    session = ClassroomSession(classroom_id=classroom.id, teacher_id=teacher.id, subject="Biologi")
    db_session.add(session)
    db_session.commit()
    metric = ClassroomMetric(session_id=session.id, focus_percentage=30.0)
    db_session.add(metric)
    db_session.commit()
    data_self = DashboardService.get_dashboard_warnings(db_session, TopEntityTarget.CLASSROOM, threshold=50.0, role="teacher", uid=teacher.id)
    assert len(data_self) == 1
    other_uid = uuid.uuid4()
    data_other = DashboardService.get_dashboard_warnings(db_session, TopEntityTarget.CLASSROOM, threshold=50.0, role="teacher", uid=other_uid)
    assert len(data_other) == 0


def test_get_metrics_api(client_principal, db_session):
    teacher = setup_teacher(db_session, "Metric API Teacher")
    c1 = setup_classroom(db_session, "Metric API Class")
    today = date.today()
    session = ClassroomSession(classroom_id=c1.id, teacher_id=teacher.id, subject="Biologi", start_time=datetime.now())
    db_session.add(session)
    db_session.commit()
    metric = ClassroomMetric(session_id=session.id, focus_percentage=75.0, active_students=20, using_phone_count=1, raised_hand_count=5)
    db_session.add(metric)
    db_session.commit()
    start_date = today - timedelta(days=1)
    end_date = today + timedelta(days=1)
    response = client_principal.get(f"/dashboard/metrics?granularity=daily&start_date={start_date}&end_date={end_date}")
    assert response.status_code == 200
    data = response.json()["data"]
    assert len(data) >= 1
    assert data[0]["type"] == "daily"
    assert "avg_focus_percentage" in data[0]

def test_top_performers_api_student(client_principal, db_session):
    teacher = setup_teacher(db_session, "Top Perf API Teacher")
    c1 = setup_classroom(db_session, "Top Perf API Class")
    s1 = Student(name="API Student", nis="API-1", classroom_id=c1.id)
    db_session.add(s1)
    db_session.commit()
    session = ClassroomSession(classroom_id=c1.id, teacher_id=teacher.id, subject="Math")
    db_session.add(session)
    db_session.commit()
    sm1 = StudentMetric(session_id=session.id, student_id=s1.id, focus_score=99.0, raised_hand_count=10)
    db_session.add(sm1)
    db_session.commit()
    response = client_principal.get("/dashboard/top-performers/student?limit=5&sort_by=focus")
    assert response.status_code == 200
    data = response.json()["data"]
    assert len(data) >= 1
    found_student = any(item["name"] == "API Student" and item["avg_focus_percentage"] == 99.0 for item in data)
    assert found_student

def test_top_performers_api_teacher_forbidden(client_teacher):
    response = client_teacher.get("/dashboard/top-performers/teacher")
    assert response.status_code == 403
    assert response.json()["message"] == "Teachers cannot view teacher rankings"
    assert response.json()["data"] == []

def test_warnings_api_classroom(client_principal, db_session):
    teacher = setup_teacher(db_session, "Warn API Teacher")
    c1 = setup_classroom(db_session, "Warn API Class")
    session = ClassroomSession(classroom_id=c1.id, teacher_id=teacher.id, subject="Physics")
    db_session.add(session)
    db_session.commit()
    metric = ClassroomMetric(session_id=session.id, focus_percentage=30.0, raised_hand_count=0)
    db_session.add(metric)
    db_session.commit()
    response = client_principal.get("/dashboard/warnings/classroom?threshold=50.0")
    assert response.status_code == 200
    data = response.json()["data"]
    assert len(data) >= 1
    found_warning = any(item["name"] == "Warn API Class" for item in data)
    assert found_warning

def test_warnings_api_teacher_forbidden(client_teacher):
    response = client_teacher.get("/dashboard/warnings/teacher?threshold=60.0")
    assert response.status_code == 403
    assert response.json()["message"] == "Teachers cannot view teacher warnings"
    assert response.json()["data"] == []
