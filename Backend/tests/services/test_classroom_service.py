import pytest
import uuid
from app.modules.classroom.service import ClassroomService
from app.modules.classroom.schema import ClassroomCreate
from app.models.classroom_session import ClassroomSession
from app.models.classroom_metric import ClassroomMetric
from app.models.student import Student
from app.core.exceptions import ConflictException, NotFoundException

def create_test_session(db, classroom_id, subject="Math"):
    session = ClassroomSession(classroom_id=classroom_id, subject=subject)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session

def create_test_metric(db, session_id, focus=80.0, active=20, phone=2, raised=5):
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

def generate_unique_classroom():
    uid = uuid.uuid4().hex[:6]
    return ClassroomCreate(name=f"Classroom {uid}")

def test_create_classroom_success(db_session):
    data = generate_unique_classroom()    
    classroom = ClassroomService.create_classroom(db_session, data)
    assert classroom.id is not None
    assert classroom.name == data.name

def test_create_classroom_reactivate_flow(db_session):
    data = generate_unique_classroom()
    classroom = ClassroomService.create_classroom(db_session, data)
    ClassroomService.delete_classroom(db_session, classroom.id)
    new_classroom = ClassroomService.create_classroom(db_session, data)
    assert new_classroom.id == classroom.id
    assert new_classroom.deleted_at is None
    assert new_classroom.name == data.name

def test_get_all_classrooms_search(db_session):
    data = generate_unique_classroom()
    ClassroomService.create_classroom(db_session, data)    
    items, total = ClassroomService.get_all_classrooms(db_session, 1, 10, search=data.name)
    
    assert total >= 1
    assert items[0].name == data.name

def test_update_classroom_name(db_session):
    data = generate_unique_classroom()
    classroom = ClassroomService.create_classroom(db_session, data)    
    update_data = {"name": f"Updated {data.name}"}
    updated_classroom = ClassroomService.update_classroom(db_session, classroom.id, update_data)
    assert updated_classroom.name == update_data["name"]

def test_delete_classroom_success(db_session):
    data = generate_unique_classroom()
    classroom = ClassroomService.create_classroom(db_session, data)
    deleted = ClassroomService.delete_classroom(db_session, classroom.id)
    assert deleted.deleted_at is not None

def test_create_classroom_conflict(db_session):
    data = generate_unique_classroom()
    ClassroomService.create_classroom(db_session, data)    
    with pytest.raises(ConflictException, match=f"Classroom dengan nama '{data.name}' sudah terdaftar"):
        ClassroomService.create_classroom(db_session, data)

def test_get_classroom_detail_with_metrics_success(db_session):
    classroom = ClassroomService.create_classroom(db_session, generate_unique_classroom())
    session = create_test_session(db_session, classroom.id)
    create_test_metric(db_session, session.id, focus=80.0, active=20, phone=2, raised=4)
    create_test_metric(db_session, session.id, focus=100.0, active=30, phone=0, raised=6)
    detail = ClassroomService.get_classroom_detail(db_session, classroom.id)
    assert detail.metrics_summary.avg_focus_percentage == 90.0 # (80+100)/2
    assert detail.metrics_summary.avg_active_students == 25.0 # (20+30)/2
    assert detail.metrics_summary.avg_raised_hand_count == 5.0 # (4+6)/2

def test_get_sessions_with_metrics_list(db_session):
    classroom = ClassroomService.create_classroom(db_session, generate_unique_classroom())
    session = create_test_session(db_session, classroom.id, subject="Fisika")
    create_test_metric(db_session, session.id, focus=90.0)
    items, total = ClassroomService.get_sessions(db_session, classroom.id, 1, 10)
    assert total == 1
    assert items[0].subject == "Fisika"
    assert items[0].metrics.focus_percentage == 90.0

def test_get_sessions_search_filtering(db_session):
    classroom = ClassroomService.create_classroom(db_session, generate_unique_classroom())
    create_test_session(db_session, classroom.id, subject="Matematika")
    create_test_session(db_session, classroom.id, subject="Sejarah")
    items, total = ClassroomService.get_sessions(db_session, classroom.id, 1, 10, search="Matematika")
    assert total == 1
    assert items[0].subject == "Matematika"

def test_get_students_by_classroom(db_session):
    classroom = ClassroomService.create_classroom(db_session, generate_unique_classroom())
    uid = uuid.uuid4().hex[:6]
    s1 = Student(name="Siswa A", nis=f"NIS-{uid}-A", classroom_id=classroom.id)
    s2 = Student(name="Siswa B", nis=f"NIS-{uid}-B", classroom_id=classroom.id)
    db_session.add_all([s1, s2])
    db_session.commit()
    items, total = ClassroomService.get_students(db_session, classroom.id, page=1, size=10)
    assert total == 2
    names = [s.name for s in items]
    assert "Siswa A" in names
    assert "Siswa B" in names

def test_get_students_search(db_session):
    classroom = ClassroomService.create_classroom(db_session, generate_unique_classroom())
    uid1 = uuid.uuid4().hex[:6]
    uid2 = uuid.uuid4().hex[:6]
    s1 = Student(name="Andi", nis=f"NIS-{uid1}", classroom_id=classroom.id)
    s2 = Student(name="Budi", nis=f"NIS-{uid2}", classroom_id=classroom.id)
    db_session.add_all([s1, s2])
    db_session.commit()
    items, total = ClassroomService.get_students(db_session, classroom.id, page=1, size=10, search="Andi")
    assert total == 1
    assert items[0].name == "Andi"
