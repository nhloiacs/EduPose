import uuid
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from app.models.camera import Camera
from app.models.classroom_session import ClassroomSession

class CameraRepository:
    @staticmethod
    def get_by_id(db: Session, camera_id: uuid.UUID):
        return db.query(Camera).filter(Camera.id == camera_id, Camera.deleted_at.is_(None)).first()

    @staticmethod
    def get_by_name(db: Session, name: str):
        return db.query(Camera).filter(Camera.name == name, Camera.deleted_at.is_(None)).first()

    @staticmethod
    def get_by_endpoint(db: Session, endpoint: str):
        return db.query(Camera).filter(Camera.endpoint == endpoint, Camera.deleted_at.is_(None)).first()

    @staticmethod
    def get_all(db: Session, skip: int = 0, limit: int = 10, search: Optional[str] = None):
        query = db.query(Camera).filter(Camera.deleted_at.is_(None))
        if search:
            query = query.filter(Camera.name.ilike(f"%{search}%"))
        total = query.count()
        items = query.order_by(Camera.created_at.desc()).offset(skip).limit(limit).all()
        return items, total

    @staticmethod
    def create(db: Session, data: dict):
        camera = Camera(**data)
        db.add(camera)
        db.commit()
        db.refresh(camera)
        return camera

    @staticmethod
    def update(db: Session, camera: Camera, update_data: dict):
        for key, value in update_data.items():
            setattr(camera, key, value)
        db.commit()
        db.refresh(camera)
        return camera

    @staticmethod
    def soft_delete(db: Session, camera_id: uuid.UUID):
        camera = db.query(Camera).filter(Camera.id == camera_id, Camera.deleted_at.is_(None)).first()
        if camera:
            camera.deleted_at = func.now()
            db.commit()
        return camera

    @staticmethod
    def get_select_options(db: Session, search: Optional[str] = None):
        active_sessions_subquery = db.query(ClassroomSession.camera_id).filter(
            ClassroomSession.status == 'ONGOING',
            ClassroomSession.deleted_at.is_(None),
            ClassroomSession.camera_id.isnot(None)
        ).subquery()
        query = db.query(Camera.id, Camera.name).filter(
            Camera.deleted_at.is_(None),
            Camera.status == 'ONLINE',
            Camera.id.notin_(active_sessions_subquery.select())
        )
        if search:
            query = query.filter(Camera.name.ilike(f"%{search}%"))
        return query.order_by(Camera.name.asc()).all()
