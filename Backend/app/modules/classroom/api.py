import uuid
from fastapi import APIRouter, Depends, Query, Body
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.modules.classroom.schema import ClassroomCreate, ClassroomRead, PaginatedClassroomResponse, ClassroomUpdate, ClassroomDetailResponse, PaginatedClassroomSessionResponse, PaginatedClassroomStudentResponse, ClassroomSelectRead
from app.core.responses import BaseResponse, PaginationMeta
from app.modules.classroom.service import ClassroomService
from app.core.auth_deps import require_principal, require_principal_or_teacher
from typing import Optional, List

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

@router.get("/select", response_model=BaseResponse[List[ClassroomSelectRead]], summary="Get classroom options for dropdown")
def get_classroom_select(
    search: Optional[str] = Query(None), 
    db: Session = Depends(get_db), 
    _: dict = Depends(require_principal_or_teacher)
):
    """
    Mengambil list ringan (id, name) untuk kebutuhan select/dropdown di frontend
    """
    items = ClassroomService.get_classroom_options(db, search)
    return BaseResponse(message="Classroom options retrieved successfully", data=items)

@router.get("/{classroom_id}/edit", response_model=BaseResponse[ClassroomRead], summary="Get classroom edit data")
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

@router.get("/{classroom_id}", response_model=BaseResponse[ClassroomDetailResponse])
def get_classroom_detail(classroom_id: uuid.UUID, db: Session = Depends(get_db), _: dict = Depends(require_principal)):
    """
    Mengambil detail classroom lengkap beserta agregasi metrik (rata-rata fokus, dll)
    """
    return BaseResponse(message="Classroom detail retrieved successfully", data=ClassroomService.get_classroom_detail(db, classroom_id))

@router.get("/{classroom_id}/sessions", response_model=BaseResponse[PaginatedClassroomSessionResponse])
def get_classroom_sessions(classroom_id: uuid.UUID, page: int = 1, size: int = 10, search: str = None, db: Session = Depends(get_db)):
    """
    Mengambil riwayat sesi yang dimiliki kelas 
    """
    items, total = ClassroomService.get_sessions(db, classroom_id, page, size, search)
    return BaseResponse(message="Classroom sessions retrieved successfully", data={"items": items, "meta": {"total": total, "page": page, "size": size}})

@router.get("/{classroom_id}/students", response_model=BaseResponse[PaginatedClassroomStudentResponse])
def get_classroom_students(classroom_id: uuid.UUID, page: int = 1, size: int = 10, search: str = None, db: Session = Depends(get_db)):
    """
    Mengambil data siswa yang dimiliki kelas
    """
    items, total = ClassroomService.get_students(db, classroom_id, page, size, search)
    return BaseResponse(message="Classroom students retrieved successfully", data={"items": items, "meta": {"total": total, "page": page, "size": size}})
