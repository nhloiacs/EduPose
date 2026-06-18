import pytest
import io
import uuid
from starlette.datastructures import UploadFile
from app.services.student_service import StudentService
from app.schemas.student import StudentCreate
from app.models.classroom import Classroom
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