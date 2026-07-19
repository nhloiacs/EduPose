import uuid
from fastapi import APIRouter, Depends, Query, Path
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database.database import get_db
from app.core.auth_deps import require_principal_or_teacher, require_principal
from app.core.responses import BaseResponse, PaginationMeta
from app.modules.camera.schema import (
    CameraCreate, CameraUpdate, CameraRead, 
    PaginatedCameraResponse, CameraSelectRead
)
from app.modules.camera.service import CameraService

router = APIRouter(prefix="/cameras", tags=["Cameras"])

@router.post("/", response_model=BaseResponse[CameraRead])
def create_camera(
    data: CameraCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_principal)
):
    camera = CameraService.create_camera(db, data)
    return BaseResponse(message="Kamera berhasil ditambahkan", data=camera)

@router.get("/", response_model=BaseResponse[PaginatedCameraResponse])
def list_cameras(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_principal_or_teacher)
):
    items, total = CameraService.get_all_cameras(db, page, size, search)
    meta = PaginationMeta(page=page, size=size, total=total)
    return BaseResponse(
        message="Daftar kamera berhasil diambil",
        data=PaginatedCameraResponse(items=items, meta=meta)
    )

@router.get("/select", response_model=BaseResponse[List[CameraSelectRead]])
def get_camera_select_options(
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_principal_or_teacher)
):
    options = CameraService.get_camera_options(db, search)
    return BaseResponse(message="Opsi kamera berhasil diambil", data=options)

@router.get("/{camera_id}", response_model=BaseResponse[CameraRead])
def get_camera_detail(
    camera_id: uuid.UUID = Path(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_principal_or_teacher)
):
    camera = CameraService.get_camera_by_id(db, camera_id)
    return BaseResponse(message="Detail kamera berhasil diambil", data=camera)

@router.patch("/{camera_id}", response_model=BaseResponse[CameraRead])
def update_camera(
    data: CameraUpdate,
    camera_id: uuid.UUID = Path(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_principal)
):
    camera = CameraService.update_camera(db, camera_id, data)
    return BaseResponse(message="Kamera berhasil diperbarui", data=camera)

@router.delete("/{camera_id}", response_model=BaseResponse[None])
def delete_camera(
    camera_id: uuid.UUID = Path(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_principal)
):
    CameraService.delete_camera(db, camera_id)
    return BaseResponse(message="Kamera berhasil dihapus")
