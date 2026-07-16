import pytest
import uuid
from app.modules.dashboard.service import DashboardService
from app.models.student import Student
from app.models.classroom import Classroom
from app.models.teacher import Teacher
from app.models.classroom_session import ClassroomSession
from app.models.classroom_metric import ClassroomMetric

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
