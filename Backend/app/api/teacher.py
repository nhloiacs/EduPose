import uuid
from fastapi import APIRouter, Depends, Query, Form, UploadFile
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.schemas.teacher import TeacherCreate, TeacherRead, PaginatedTeacherResponse 
from app.schemas.base import BaseResponse, PaginationMeta
from app.services.teacher_service import TeacherService
from app.core.auth_deps import require_principal
from typing import Optional

router = APIRouter(prefix="/teachers", tags=["Teachers"])

@router.post("/", response_model=BaseResponse[TeacherRead], summary="Create a new teacher")
def create_teacher(
    name: str = Form(...),
    email: str = Form(...),
    role: str = Form(...),
    password: str = Form(...),
    nip: str = Form(...),
    file: UploadFile = Form(...),
    db: Session = Depends(get_db),
    _: dict = Depends(require_principal)
):
    """
    Membuat teacher baru (Khusus Principal)
    """
    data = TeacherCreate(
        name = name,
        email = email,
        role = role,
        password = password,
        nip = nip
    )

    teacher = TeacherService.create_teacher(db, data, file)
    return BaseResponse(message="Teacher created successfully", data=teacher)

@router.get("/", response_model=BaseResponse[PaginatedTeacherResponse], summary="Get all teachers")
def list_teachers(
    page: int = Query(1, gt=0),
    size: int = Query(10, gt=0),
    search: Optional[str] = Query(None), 
    db: Session = Depends(get_db),
    _: dict = Depends(require_principal)
):
    """
    Mengambil daftar teacher dengan pagination
    """
    items, total = TeacherService.get_all_teachers(db, page, size, search)
    
    paginated_data = PaginatedTeacherResponse(
        items=items,
        meta=PaginationMeta(total=total, page=page, size=size)
    )
    
    return BaseResponse(message="Teachers retrieved successfully", data=paginated_data)

@router.get("/{teacher_id}", response_model=BaseResponse[TeacherRead], summary="Get teacher detail")
def get_teacher(teacher_id: uuid.UUID, db: Session = Depends(get_db), _: dict = Depends(require_principal)):
    teacher = TeacherService.get_teacher_by_id(db, teacher_id)
    return BaseResponse(message="Teacher retrieved successfully", data=teacher)


@router.patch("/{teacher_id}", response_model=BaseResponse[TeacherRead], summary="Update teacher")
def update_teacher(
    teacher_id: uuid.UUID,
    name: Optional[str] = Form(None),
    email: Optional[str] = Form(None),
    role: Optional[str] = Form(None),
    nip: Optional[str] = Form(None),
    file: Optional[UploadFile] = Form(None),
    db: Session = Depends(get_db),
    _: dict = Depends(require_principal)
):
    update_data = {}
    if name is not None: update_data["name"] = name
    if email is not None: update_data["email"] = email
    if role is not None: update_data["role"] = role
    if nip is not None: update_data["nip"] = nip
    
    teacher = TeacherService.update_teacher(db, teacher_id, update_data, file)
    
    return BaseResponse(message="Teacher updated successfully", data=teacher)

@router.delete("/{teacher_id}", response_model=BaseResponse[None], summary="Delete a teacher")
def delete_teacher(
    teacher_id: uuid.UUID, 
    db: Session = Depends(get_db),
    _: dict = Depends(require_principal)
):
    """
    Menghapus teacher (Soft Delete)
    """
    TeacherService.delete_teacher(db, str(teacher_id))
    return BaseResponse(message="Teacher deleted successfully", data=None)