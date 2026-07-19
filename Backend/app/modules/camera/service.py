import uuid
from sqlalchemy.orm import Session
from typing import List, Tuple, Optional
from app.core.exceptions import ConflictException, NotFoundException
from app.modules.camera.repository import CameraRepository
from app.modules.camera.schema import CameraCreate, CameraUpdate, CameraRead, CameraSelectRead

class CameraService:
    @staticmethod
    def create_camera(db: Session, data: CameraCreate) -> CameraRead:
        if CameraRepository.get_by_name(db, data.name):
            raise ConflictException(f"Kamera dengan nama '{data.name}' sudah terdaftar.")
        if CameraRepository.get_by_endpoint(db, data.endpoint):
            raise ConflictException(f"Kamera dengan endpoint '{data.endpoint}' sudah digunakan.")
        camera = CameraRepository.create(db, data.model_dump())
        return camera

    @staticmethod
    def get_all_cameras(db: Session, page: int, size: int, search: Optional[str] = None) -> Tuple[List[CameraRead], int]:
        page = max(1, page)
        skip = (page - 1) * size
        return CameraRepository.get_all(db, skip, size, search)

    @staticmethod
    def get_camera_by_id(db: Session, camera_id: uuid.UUID) -> CameraRead:
        camera = CameraRepository.get_by_id(db, camera_id)
        if not camera:
            raise NotFoundException("Kamera tidak ditemukan.")
        return camera

    @staticmethod
    def update_camera(db: Session, camera_id: uuid.UUID, data: CameraUpdate) -> CameraRead:
        camera = CameraRepository.get_by_id(db, camera_id)
        if not camera:
            raise NotFoundException("Kamera tidak ditemukan.")
        update_data = data.model_dump(exclude_unset=True)
        if "name" in update_data and update_data["name"] != camera.name:
            if CameraRepository.get_by_name(db, update_data["name"]):
                raise ConflictException(f"Nama '{update_data['name']}' sudah digunakan kamera lain.")
        if "endpoint" in update_data and update_data["endpoint"] != camera.endpoint:
            if CameraRepository.get_by_endpoint(db, update_data["endpoint"]):
                raise ConflictException(f"Endpoint '{update_data['endpoint']}' sudah digunakan kamera lain.")
        return CameraRepository.update(db, camera, update_data)

    @staticmethod
    def delete_camera(db: Session, camera_id: uuid.UUID):
        camera = CameraRepository.get_by_id(db, camera_id)
        if not camera:
            raise NotFoundException("Kamera tidak ditemukan.")
        CameraRepository.soft_delete(db, camera_id)
        return camera

    @staticmethod
    def get_camera_options(db: Session, search: Optional[str] = None) -> List[CameraSelectRead]:
        items = CameraRepository.get_select_options(db, search)
        return [CameraSelectRead(id=i.id, name=i.name) for i in items]
