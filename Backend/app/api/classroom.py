import uuid
from fastapi import APIRouter, Depends, Query, Body
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.schemas.classroom import ClassroomCreate, ClassroomRead, PaginatedClassroomResponse, ClassroomUpdate
from app.schemas.base import BaseResponse, PaginationMeta
from app.services.classroom_service import ClassroomService
from app.core.auth_deps import require_principal
from typing import Optional

router = APIRouter(prefix="/classrooms", tags=["Classrooms"])

@router.post("/", response_model=BaseResponse[ClassroomRead], summary="Create a new classroom")
def create_classroom(
    data: ClassroomCreate = Body(...),
    db: Session = Depends(get_db),
    _: dict = Depends(require_principal)
):
    """
    Membuat classroom baru (Khusus Principal)
    """
    classroom = ClassroomService.create_classroom(db, data)
    return BaseResponse(message="Classroom created successfully", data=classroom)

@router.get("/", response_model=BaseResponse[PaginatedClassroomResponse], summary="Get all classrooms")
def list_classrooms(
    page: int = Query(1, gt=0),
    size: int = Query(10, gt=0),
    search: Optional[str] = Query(None), 
    db: Session = Depends(get_db),
    _: dict = Depends(require_principal)
):
    """
    Mengambil daftar classroom dengan pagination
    """
    items, total = ClassroomService.get_all_classrooms(db, page, size, search)
    
    paginated_data = PaginatedClassroomResponse(
        items=items,
        meta=PaginationMeta(total=total, page=page, size=size)
    )
    
    return BaseResponse(message="Classrooms retrieved successfully", data=paginated_data)

@router.get("/{classroom_id}", response_model=BaseResponse[ClassroomRead], summary="Get classroom detail")
def get_classroom(
    classroom_id: uuid.UUID, 
    db: Session = Depends(get_db), 
    _: dict = Depends(require_principal)
):
    """
    Mengambil classroom by id
    """
    classroom = ClassroomService.get_classroom_by_id(db, classroom_id)
    return BaseResponse(message="Classroom retrieved successfully", data=classroom)

@router.patch("/{classroom_id}", response_model=BaseResponse[ClassroomRead], summary="Update classroom")
def update_classroom(
    classroom_id: uuid.UUID,
    data: ClassroomUpdate = Body(...),
    db: Session = Depends(get_db),
    _: dict = Depends(require_principal)
):
    """
    Mengupdate classroom
    """
    update_data = data.model_dump(exclude_unset=True)
    classroom = ClassroomService.update_classroom(db, classroom_id, update_data)
    return BaseResponse(message="Classroom updated successfully", data=classroom)

@router.delete("/{classroom_id}", response_model=BaseResponse[None], summary="Delete a classroom")
def delete_classroom(
    classroom_id: uuid.UUID, 
    db: Session = Depends(get_db),
    _: dict = Depends(require_principal)
):
    """
    Menghapus classroom (Soft Delete)
    """
    ClassroomService.delete_classroom(db, classroom_id)
    return BaseResponse(message="Classroom deleted successfully", data=None)