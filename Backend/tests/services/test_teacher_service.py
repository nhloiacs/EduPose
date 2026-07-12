import pytest
import io
import uuid
from starlette.datastructures import UploadFile
from app.core.exceptions import ConflictException, NotFoundException
from app.modules.teacher.service import TeacherService
from app.modules.teacher.schema import TeacherCreate
from app.models.classroom import Classroom
from app.models.classroom_session import ClassroomSession
from app.models.classroom_metric import ClassroomMetric

def create_dummy_file(filename="test.jpg"):
    file_content = b"fake-image-content"
    return UploadFile(
        filename=filename,
        file=io.BytesIO(file_content)
    )

def generate_unique_teacher():
    uid = uuid.uuid4().hex[:6]
    return TeacherCreate(
        name=f"Teacher {uid}",
        nip=f"NIP-{uid}",
        email=f"teacher{uid}@sekolah.com",
        role="teacher",
        password="password123"
    )

def create_test_classroom_for_teacher(db):
    uid = uuid.uuid4().hex[:4]
    classroom = Classroom(name=f"Room-{uid}")
    db.add(classroom)
    db.commit()
    db.refresh(classroom)
    return classroom

def create_test_session_for_teacher(db, classroom_id, teacher_id, subject="Math"):
    session = ClassroomSession(classroom_id=classroom_id, teacher_id=teacher_id, subject=subject)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session

def create_test_metric_for_teacher(db, session_id, focus=80.0, active=20, phone=2, raised=5):
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

def test_create_teacher_success(db_session):
    data = generate_unique_teacher()
    file = create_dummy_file()    
    teacher = TeacherService.create_teacher(db_session, data, file)
    assert teacher.id is not None
    assert teacher.name == data.name
    assert teacher.email == data.email
    assert "teachers" in teacher.photo_filepath

def test_create_teacher_reactivate_flow(db_session):
    data = generate_unique_teacher()
    file = create_dummy_file()
    teacher = TeacherService.create_teacher(db_session, data, file)
    TeacherService.delete_teacher(db_session, str(teacher.id))    
    new_teacher = TeacherService.create_teacher(db_session, data, file)
    assert new_teacher.id == teacher.id
    assert new_teacher.deleted_at is None
    assert new_teacher.name == data.name

def test_get_all_teachers_search(db_session):
    data = generate_unique_teacher()
    TeacherService.create_teacher(db_session, data, create_dummy_file())        
    items, total = TeacherService.get_all_teachers(db_session, 1, 10, search=data.name)
    assert total >= 1
    assert items[0].name == data.name

def test_update_teacher_name(db_session):
    data = generate_unique_teacher()
    teacher = TeacherService.create_teacher(db_session, data, create_dummy_file())    
    update_data = {"name": "Jojo Update"}
    updated_teacher = TeacherService.update_teacher(db_session, teacher.id, update_data)
    assert updated_teacher.name == "Jojo Update"
    assert updated_teacher.email == data.email

def test_delete_teacher_success(db_session):
    data = generate_unique_teacher()
    teacher = TeacherService.create_teacher(db_session, data, create_dummy_file())
    deleted = TeacherService.delete_teacher(db_session, str(teacher.id))
    assert deleted.deleted_at is not None

def test_create_teacher_conflict(db_session):
    data = generate_unique_teacher()
    TeacherService.create_teacher(db_session, data, create_dummy_file())        
    with pytest.raises(ConflictException, match="Email atau NIP sudah terdaftar"):
        TeacherService.create_teacher(db_session, data, create_dummy_file())

def test_get_teacher_detail_with_metrics_success(db_session):
    data = generate_unique_teacher()
    teacher = TeacherService.create_teacher(db_session, data, create_dummy_file())
    classroom = create_test_classroom_for_teacher(db_session)
    session = create_test_session_for_teacher(db_session, classroom.id, teacher.id, subject="Biologi")
    create_test_metric_for_teacher(db_session, session.id, focus=80.0, active=20, phone=2, raised=4)
    create_test_metric_for_teacher(db_session, session.id, focus=100.0, active=30, phone=0, raised=6)
    detail = TeacherService.get_teacher_detail(db_session, teacher.id)
    assert detail.name == data.name
    assert detail.metrics_summary.avg_focus_percentage == 90.0
    assert detail.metrics_summary.avg_active_students == 25.0
    assert detail.metrics_summary.avg_using_phone_count == 1.0
    assert detail.metrics_summary.avg_raised_hand_count == 5.0

def test_get_teacher_sessions_list_success(db_session):
    data = generate_unique_teacher()
    teacher = TeacherService.create_teacher(db_session, data, create_dummy_file())
    classroom = create_test_classroom_for_teacher(db_session)
    session = create_test_session_for_teacher(db_session, classroom.id, teacher.id, subject="Fisika")
    create_test_metric_for_teacher(db_session, session.id, focus=90.0, active=25)
    items, total = TeacherService.get_teacher_sessions(db_session, teacher.id, 1, 10)
    assert total == 1
    assert items[0].subject == "Fisika"
    assert items[0].classroom_name == classroom.name
    assert items[0].metrics.focus_percentage == 90.0
    assert items[0].metrics.active_students == 25.0

def test_get_teacher_sessions_search(db_session):
    data = generate_unique_teacher()
    teacher = TeacherService.create_teacher(db_session, data, create_dummy_file())
    classroom = create_test_classroom_for_teacher(db_session)
    create_test_session_for_teacher(db_session, classroom.id, teacher.id, subject="Matematika")
    create_test_session_for_teacher(db_session, classroom.id, teacher.id, subject="Sejarah")
    items, total = TeacherService.get_teacher_sessions(db_session, teacher.id, 1, 10, search="Matematika")
    assert total == 1
    assert items[0].subject == "Matematika"

def test_teacher_metrics_not_found(db_session):
    fake_id = uuid.uuid4()
    with pytest.raises(NotFoundException, match="Teacher tidak ditemukan"):
        TeacherService.get_teacher_detail(db_session, fake_id)
    with pytest.raises(NotFoundException, match="Teacher tidak ditemukan"):
        TeacherService.get_teacher_sessions(db_session, fake_id, 1, 10)
