import pytest
import uuid
from app.services.classroom_service import ClassroomService
from app.schemas.classroom import ClassroomCreate
from app.core.exceptions import ConflictException, NotFoundException

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