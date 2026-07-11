import pytest
import io
import uuid
from starlette.datastructures import UploadFile
from app.modules.student.service import StudentService
from app.modules.student.schema import StudentCreate
from app.models.classroom import Classroom
from app.models.classroom_session import ClassroomSession
from app.models.student_metric import StudentMetric
from app.core.exceptions import ConflictException, NotFoundException

def create_dummy_file(filename="test.jpg"):
    file_content = b"fake-image-content"
    return UploadFile(
        filename=filename,
        file=io.BytesIO(file_content)
    )

def create_test_classroom(db):
    classroom = Classroom(name=f"Classroom {uuid.uuid4().hex[:4]}")
    db.add(classroom)
    db.commit()
    db.refresh(classroom)
    return classroom

def create_test_session(db, classroom_id, subject="Math"):
    session = ClassroomSession(
        classroom_id=classroom_id,
        subject=subject,
        status="ONGOING"
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session

def create_test_metric(db, session_id, student_id, focus=80.0, distracted=20.0, raised=1):
    metric = StudentMetric(
        session_id=session_id,
        student_id=student_id,
        focus_score=focus,
        distracted_score=distracted,
        raised_hand_count=raised
    )
    db.add(metric)
    db.commit()
    db.refresh(metric)
    return metric

def generate_unique_student(classroom_id):
    uid = uuid.uuid4().hex[:6]
    return StudentCreate(
        name=f"Student {uid}",
        nis=f"NIS-{uid}",
        classroom_id=classroom_id
    )

def test_create_student_success(db_session):
    classroom = create_test_classroom(db_session)
    data = generate_unique_student(classroom.id)
    file = create_dummy_file()        
    student = StudentService.create_student(db_session, data, file)
    assert student.id is not None
    assert student.name == data.name
    assert student.nis == data.nis
    assert "students" in student.photo_filepath

def test_create_student_reactivate_flow(db_session):
    classroom = create_test_classroom(db_session)
    data = generate_unique_student(classroom.id)
    file = create_dummy_file()
    student = StudentService.create_student(db_session, data, file)
    StudentService.delete_student(db_session, student.id)        
    new_student = StudentService.create_student(db_session, data, file)
    assert new_student.id == student.id
    assert new_student.name == data.name

def test_get_all_students_search(db_session):
    classroom = create_test_classroom(db_session)
    data = generate_unique_student(classroom.id)
    StudentService.create_student(db_session, data, create_dummy_file())        
    items, total = StudentService.get_all_students(db_session, 1, 10, search=data.name)
    assert total >= 1
    assert items[0].name == data.name

def test_update_student_name(db_session):
    classroom = create_test_classroom(db_session)
    data = generate_unique_student(classroom.id)
    student = StudentService.create_student(db_session, data, create_dummy_file())    
    update_data = {"name": "Jojo Update"}
    updated_student = StudentService.update_student(db_session, student.id, update_data)
    assert updated_student.name == "Jojo Update"
    assert updated_student.nis == data.nis

def test_delete_student_success(db_session):
    classroom = create_test_classroom(db_session)
    data = generate_unique_student(classroom.id)
    student = StudentService.create_student(db_session, data, create_dummy_file())
    deleted = StudentService.delete_student(db_session, student.id)
    assert deleted.deleted_at is not None

def test_create_student_conflict(db_session):
    classroom = create_test_classroom(db_session)
    data = generate_unique_student(classroom.id)
    StudentService.create_student(db_session, data, create_dummy_file())        
    with pytest.raises(ConflictException, match="NIS sudah terdaftar"):
        StudentService.create_student(db_session, data, create_dummy_file())


def test_get_student_detail_with_metrics_success(db_session):
    classroom = create_test_classroom(db_session)
    student = StudentService.create_student(db_session, generate_unique_student(classroom.id), create_dummy_file())
    session1 = create_test_session(db_session, classroom.id, subject="Math")
    session2 = create_test_session(db_session, classroom.id, subject="Science")
    create_test_metric(db_session, session1.id, student.id, focus=80.0, distracted=20.0, raised=2)
    create_test_metric(db_session, session2.id, student.id, focus=100.0, distracted=0.0, raised=0)
    detail = StudentService.get_student_detail_with_metrics(db_session, student.id)
    assert detail.metrics_summary.avg_focus_score == 90.0  # (80+100)/2
    assert detail.metrics_summary.total_raised_hand_count == 2

def test_get_student_detail_no_metrics(db_session):
    classroom = create_test_classroom(db_session)
    student = StudentService.create_student(db_session, generate_unique_student(classroom.id), create_dummy_file())
    detail = StudentService.get_student_detail_with_metrics(db_session, student.id)
    assert detail.metrics_summary.avg_focus_score == 0
    assert detail.metrics_summary.total_raised_hand_count == 0

def test_get_student_sessions_success(db_session):
    classroom = create_test_classroom(db_session)
    student = StudentService.create_student(db_session, generate_unique_student(classroom.id), create_dummy_file())
    session = create_test_session(db_session, classroom.id, subject="Fisika")
    create_test_metric(db_session, session.id, student.id)
    items, total = StudentService.get_student_sessions(db_session, student.id, page=1, size=10)
    assert total == 1
    assert items[0].subject == "Fisika"
    assert items[0].metrics.focus_score == 80.0

def test_get_student_sessions_search(db_session):
    classroom = create_test_classroom(db_session)
    student = StudentService.create_student(db_session, generate_unique_student(classroom.id), create_dummy_file())
    session1 = create_test_session(db_session, classroom.id, subject="Matematika")
    session2 = create_test_session(db_session, classroom.id, subject="Sejarah")
    create_test_metric(db_session, session1.id, student.id)
    create_test_metric(db_session, session2.id, student.id)
    items, total = StudentService.get_student_sessions(db_session, student.id, 1, 10, search="Matematika")
    assert total == 1
    assert items[0].subject == "Matematika"

def test_get_student_sessions_not_found(db_session):
    with pytest.raises(NotFoundException):
        StudentService.get_student_sessions(db_session, uuid.uuid4(), 1, 10)
