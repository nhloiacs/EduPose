import pytest
import io
import uuid
from starlette.datastructures import UploadFile
from app.services.teacher_service import TeacherService
from app.schemas.teacher import TeacherCreate
from app.core.exceptions import ConflictException, NotFoundException

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

def test_create_teacher_success(db_session):
    data = generate_unique_teacher()
    file = create_dummy_file()    
    teacher = TeacherService.create_teacher(db_session, data, file)
    assert teacher.id is not None
    assert teacher.name == data.name
    assert teacher.email == data.email
    assert "profiles" in teacher.photo_filepath

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