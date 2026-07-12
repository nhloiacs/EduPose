import pytest
import uuid
from app.modules.classroom_session.service import ClassroomSessionService
from app.modules.classroom_session.schema import ClassroomSessionUpdate
from app.models.classroom import Classroom
from app.models.classroom_session import ClassroomSession
from app.models.classroom_metric import ClassroomMetric
from app.models.student import Student
from app.models.student_metric import StudentMetric
from app.core.exceptions import NotFoundException

def setup_classroom(db):
    classroom = Classroom(name=f"Room-{uuid.uuid4().hex[:6]}")
    db.add(classroom)
    db.commit()
    db.refresh(classroom)
    return classroom

def setup_session(db, classroom_id, subject="Biologi"):
    session = ClassroomSession(classroom_id=classroom_id, subject=subject)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session

def setup_classroom_metric(db, session_id, focus=80.0, active=20, phone=2, raised=3):
    metric = ClassroomMetric(
        session_id=session_id, 
        focus_percentage=focus, 
        active_students=active,
        using_phone_count=phone, 
        raised_hand_count=raised
    )
    db.add(metric)
    db.commit()

def setup_student(db, classroom_id, name="Budi"):
    uid = uuid.uuid4().hex[:6]
    student = Student(name=name, nis=f"NIS-{uid}", classroom_id=classroom_id)
    db.add(student)
    db.commit()
    db.refresh(student)
    return student

def setup_student_metric(db, session_id, student_id, focus=85.0):
    metric = StudentMetric(
        session_id=session_id, 
        student_id=student_id, 
        focus_score=focus, 
        distracted_score=15.0, 
        raised_hand_count=1
    )
    db.add(metric)
    db.commit()
    return metric

def test_get_all_sessions(db_session):
    classroom = setup_classroom(db_session)
    session1 = setup_session(db_session, classroom.id, subject="Kimia")
    session2 = setup_session(db_session, classroom.id, subject="Fisika")
    setup_classroom_metric(db_session, session1.id, focus=80.0, active=20, phone=1, raised=2)
    setup_classroom_metric(db_session, session1.id, focus=100.0, active=30, phone=3, raised=4)
    items, total = ClassroomSessionService.get_all_sessions(db_session, page=1, size=10)
    assert total >= 2
    subjects = [item.subject for item in items]
    assert "Kimia" in subjects
    assert "Fisika" in subjects
    kimia_session = next((item for item in items if item.id == session1.id), None)
    assert kimia_session is not None
    assert kimia_session.metrics_summary.avg_focus_percentage == 90.0
    assert kimia_session.metrics_summary.avg_active_students == 25.0
    assert kimia_session.metrics_summary.total_using_phone == 4
    assert kimia_session.metrics_summary.total_raised_hand == 6

def test_get_session_edit_success(db_session):
    classroom = setup_classroom(db_session)
    session = setup_session(db_session, classroom.id, subject="Matematika")
    edit_data = ClassroomSessionService.get_session_edit(db_session, session.id)
    assert edit_data.id == session.id
    assert edit_data.subject == "Matematika"

def test_get_session_detail_with_metrics(db_session):
    classroom = setup_classroom(db_session)
    session = setup_session(db_session, classroom.id, subject="Sejarah")
    setup_classroom_metric(db_session, session.id, focus=80.0, active=20, phone=1, raised=2)
    setup_classroom_metric(db_session, session.id, focus=100.0, active=30, phone=3, raised=4)
    detail = ClassroomSessionService.get_session_detail(db_session, session.id)
    assert detail.subject == "Sejarah"
    assert detail.metrics_summary.avg_focus_percentage == 90.0 
    assert detail.metrics_summary.avg_active_students == 25.0 
    assert detail.metrics_summary.total_using_phone == 4 
    assert detail.metrics_summary.total_raised_hand == 6 

def test_update_session_subject(db_session):
    classroom = setup_classroom(db_session)
    session = setup_session(db_session, classroom.id, subject="Old Subject")
    update_data = ClassroomSessionUpdate(subject="New Subject")
    updated = ClassroomSessionService.update_session(db_session, session.id, update_data)
    assert updated.subject == "New Subject"
    assert updated.id == session.id

def test_delete_session_success(db_session):
    classroom = setup_classroom(db_session)
    session = setup_session(db_session, classroom.id)
    deleted = ClassroomSessionService.delete_session(db_session, session.id)
    assert deleted.deleted_at is not None
    with pytest.raises(NotFoundException, match="Sesi kelas tidak ditemukan"):
        ClassroomSessionService.get_session_detail(db_session, session.id)

def test_get_session_students(db_session):
    classroom = setup_classroom(db_session)
    session = setup_session(db_session, classroom.id)
    student1 = setup_student(db_session, classroom.id, name="Siswa Aktif")
    student2 = setup_student(db_session, classroom.id, name="Siswa Pasif")
    setup_student_metric(db_session, session.id, student1.id, focus=95.0)
    setup_student_metric(db_session, session.id, student2.id, focus=40.0)
    items, total = ClassroomSessionService.get_session_students(db_session, session.id, page=1, size=10)
    assert total == 2
    fokus_scores = [item.focus_score for item in items]
    assert 95.0 in fokus_scores
    assert 40.0 in fokus_scores

def test_not_found_exceptions(db_session):
    fake_id = uuid.uuid4()
    with pytest.raises(NotFoundException):
        ClassroomSessionService.get_session_detail(db_session, fake_id)
    with pytest.raises(NotFoundException):
        ClassroomSessionService.get_session_edit(db_session, fake_id)
    with pytest.raises(NotFoundException):
        ClassroomSessionService.update_session(db_session, fake_id, ClassroomSessionUpdate(subject="Test"))
    with pytest.raises(NotFoundException):
        ClassroomSessionService.delete_session(db_session, fake_id)
    with pytest.raises(NotFoundException):
        ClassroomSessionService.get_session_students(db_session, fake_id, 1, 10)
