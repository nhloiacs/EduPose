import pytest
import uuid
from app.core.exceptions import ConflictException, NotFoundException
from app.modules.camera.service import CameraService
from app.modules.camera.schema import CameraCreate, CameraUpdate
from app.models.camera import Camera
from app.models.classroom import Classroom
from app.models.classroom_session import ClassroomSession

def generate_unique_camera_data():
    uid = uuid.uuid4().hex[:6]
    return CameraCreate(name=f"Cam-{uid}", endpoint=f"http://192.168.1.{uid}")

def setup_camera(db, name=None, endpoint=None, status="ONLINE"):
    uid = uuid.uuid4().hex[:6]
    cam = Camera(
        name=name or f"Cam-{uid}",
        endpoint=endpoint or f"http://10.0.0.{uid}",
        status=status
    )
    db.add(cam)
    db.commit()
    db.refresh(cam)
    return cam

def setup_classroom(db):
    cls = Classroom(name=f"Room-{uuid.uuid4().hex[:4]}")
    db.add(cls)
    db.commit()
    db.refresh(cls)
    return cls

def test_create_camera_success(db_session):
    data = generate_unique_camera_data()
    camera = CameraService.create_camera(db_session, data)
    assert camera.id is not None
    assert camera.name == data.name
    assert camera.endpoint == data.endpoint

def test_create_camera_conflict(db_session):
    data = generate_unique_camera_data()
    CameraService.create_camera(db_session, data)
    data_conflict_name = CameraCreate(name=data.name, endpoint="http://new-endpoint")
    with pytest.raises(ConflictException, match="sudah terdaftar"):
        CameraService.create_camera(db_session, data_conflict_name)
    data_conflict_endpoint = CameraCreate(name="New Cam", endpoint=data.endpoint)
    with pytest.raises(ConflictException, match="sudah digunakan"):
        CameraService.create_camera(db_session, data_conflict_endpoint)

def test_get_all_cameras(db_session):
    setup_camera(db_session, name="Kamera Alpha")
    setup_camera(db_session, name="Kamera Beta")
    items, total = CameraService.get_all_cameras(db_session, 1, 10)
    assert total >= 2

def test_get_camera_by_id(db_session):
    cam = setup_camera(db_session)
    fetched = CameraService.get_camera_by_id(db_session, cam.id)
    assert fetched.id == cam.id
    with pytest.raises(NotFoundException):
        CameraService.get_camera_by_id(db_session, uuid.uuid4())

def test_update_camera_success(db_session):
    cam = setup_camera(db_session)
    update_data = CameraUpdate(name="Kamera Updated", status="OFFLINE")
    updated = CameraService.update_camera(db_session, cam.id, update_data)
    assert updated.name == "Kamera Updated"
    
def test_delete_camera(db_session):
    cam = setup_camera(db_session)
    CameraService.delete_camera(db_session, cam.id)
    with pytest.raises(NotFoundException):
        CameraService.get_camera_by_id(db_session, cam.id)

def test_get_camera_options_filtered(db_session):
    cam_free = setup_camera(db_session, name="Cam Free", status="ONLINE")
    cam_offline = setup_camera(db_session, name="Cam Offline", status="OFFLINE")
    cam_busy = setup_camera(db_session, name="Cam Busy", status="ONLINE")
    classroom = setup_classroom(db_session)
    session = ClassroomSession(
        classroom_id=classroom.id, 
        camera_id=cam_busy.id, 
        subject="Biologi", 
        status="ONGOING"
    )
    db_session.add(session)
    db_session.commit()
    options = CameraService.get_camera_options(db_session)
    option_ids = [opt.id for opt in options]
    assert cam_free.id in option_ids
    assert cam_offline.id not in option_ids
    assert cam_busy.id not in option_ids
