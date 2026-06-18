import uuid
from fastapi import APIRouter, Depends, Query, Form, UploadFile
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.schemas.student import StudentCreate, StudentRead, PaginatedStudentResponse
from app.schemas.base import BaseResponse, PaginationMeta
from app.services.student_service import StudentService
from app.core.auth_deps import require_principal
from typing import Optional

router = APIRouter(prefix="/students", tags=["Students"])

@router.post("/", response_model=BaseResponse[StudentRead], summary="Create a new student")
def create_student(
    name: str = Form(...),
    nis: str = Form(...),
    classroom_id: uuid.UUID = Form(...),
    file: UploadFile = Form(...),
    db: Session = Depends(get_db),
    _: dict = Depends(require_principal)
):
    """
    Membuat student baru (Khusus Principal)
    """
    data = StudentCreate(
        name = name,
        nis = nis,
        classroom_id = classroom_id
    )

    student = StudentService.create_student(db, data, file)
    return BaseResponse(message="Student created successfully", data=student)

@router.get("/", response_model=BaseResponse[PaginatedStudentResponse], summary="Get all students")
def list_students(
    page: int = Query(1, gt=0),
    size: int = Query(10, gt=0),
    search: Optional[str] = Query(None), 
    db: Session = Depends(get_db),
    _: dict = Depends(require_principal)
):
    """
    Mengambil daftar student dengan pagination
    """
    items, total = StudentService.get_all_students(db, page, size, search)
    
    paginated_data = PaginatedStudentResponse(
        items=items,
        meta=PaginationMeta(total=total, page=page, size=size)
    )
    
    return BaseResponse(message="Students retrieved successfully", data=paginated_data)

@router.get("/{student_id}", response_model=BaseResponse[StudentRead], summary="Get student detail")
def get_student(student_id: uuid.UUID, db: Session = Depends(get_db), _: dict = Depends(require_principal)):
    """
    Mengambil student by id
    """
    student = StudentService.get_student_by_id(db, student_id)
    return BaseResponse(message="Student retrieved successfully", data=student)


@router.patch("/{student_id}", response_model=BaseResponse[StudentRead], summary="Update student")
def update_student(
    student_id: uuid.UUID,
    name: Optional[str] = Form(None),
    nis: Optional[str] = Form(None),
    classroom_id: Optional[uuid.UUID] = Form(None),
    file: Optional[UploadFile] = Form(None),
    db: Session = Depends(get_db),
    _: dict = Depends(require_principal)
):
    """
    Mengupdate student
    """
    update_data = {}
    if name is not None: update_data["name"] = name
    if nis is not None: update_data["nis"] = nis
    if classroom_id is not None: update_data["classroom_id"] = classroom_id
    
    student = StudentService.update_student(db, student_id, update_data, file)
    
    return BaseResponse(message="Student updated successfully", data=student)

@router.delete("/{student_id}", response_model=BaseResponse[None], summary="Delete a student")
def delete_student(
    student_id: uuid.UUID, 
    db: Session = Depends(get_db),
    _: dict = Depends(require_principal)
):
    """
    Menghapus student (Soft Delete)
    """
    StudentService.delete_student(db, student_id)
    return BaseResponse(message="Student deleted successfully", data=None)