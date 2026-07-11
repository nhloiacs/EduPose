import uuid
from fastapi import APIRouter, Depends, Query, Body
from sqlalchemy.orm import Session
from typing import Optional
from app.database.database import get_db
from app.core.auth_deps import require_principal
from app.core.responses import BaseResponse, PaginationMeta
from app.modules.classroom_session.schema import (
    PaginatedClassroomSessionResponse, ClassroomSessionEditRead, 
    ClassroomSessionDetailRead, ClassroomSessionUpdate
)
from app.modules.classroom_session.service import ClassroomSessionService
from app.modules.classroom_session.schema import PaginatedSessionStudentMetricResponse

router = APIRouter(prefix="/classroom-sessions", tags=["Classroom Sessions"])

@router.get("/", response_model=BaseResponse[PaginatedClassroomSessionResponse], summary="Get all sessions")
def list_sessions(
    page: int = Query(1, gt=0),
    size: int = Query(10, gt=0),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: dict = Depends(require_principal)
):
    """
    Mengambil daftar riwayat sesi kelas (Pagination & Search)
    """
    items, total = ClassroomSessionService.get_all_sessions(db, page, size, search)
    paginated_data = PaginatedClassroomSessionResponse(
        items=items,
        meta=PaginationMeta(total=total, page=page, size=size)
    )
    return BaseResponse(message="Sessions retrieved successfully", data=paginated_data)

@router.get("/{session_id}/edit", response_model=BaseResponse[ClassroomSessionEditRead], summary="Get session subject for edit")
def get_session_edit(
    session_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: dict = Depends(require_principal)
):
    """
    Endpoint ringan khusus untuk load data subject ke form edit
    """
    data = ClassroomSessionService.get_session_edit(db, session_id)
    return BaseResponse(message="Session edit data retrieved", data=data)

@router.get("/{session_id}", response_model=BaseResponse[ClassroomSessionDetailRead], summary="Get session detail")
def get_session_detail(
    session_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: dict = Depends(require_principal)
):
    """
    Mengambil detail lengkap sesi beserta agregasi metrik dari perangkat
    """
    data = ClassroomSessionService.get_session_detail(db, session_id)
    return BaseResponse(message="Session detail retrieved", data=data)

@router.patch("/{session_id}", response_model=BaseResponse[ClassroomSessionEditRead], summary="Update session subject")
def update_session(
    session_id: uuid.UUID,
    data: ClassroomSessionUpdate = Body(...),
    db: Session = Depends(get_db),
    _: dict = Depends(require_principal)
):
    """
    Hanya mengizinkan update field subject
    """
    updated_data = ClassroomSessionService.update_session(db, session_id, data)
    return BaseResponse(message="Session subject updated successfully", data=updated_data)

@router.delete("/{session_id}", response_model=BaseResponse[None], summary="Delete a session")
def delete_session(
    session_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: dict = Depends(require_principal)
):
    """
    Soft delete sesi
    """
    ClassroomSessionService.delete_session(db, session_id)
    return BaseResponse(message="Session deleted successfully", data=None)


@router.get("/{session_id}/students", response_model=BaseResponse[PaginatedSessionStudentMetricResponse], summary="Get students metrics for a session")
def get_session_students(
    session_id: uuid.UUID,
    page: int = Query(1, gt=0),
    size: int = Query(10, gt=0),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: dict = Depends(require_principal)
):
    """
    Mengambil daftar siswa beserta metrik individual (fokus, distracted, raise hand) dalam suatu sesi
    """
    items, total = ClassroomSessionService.get_session_students(db, session_id, page, size, search)
    
    paginated_data = PaginatedSessionStudentMetricResponse(
        items=items,
        meta=PaginationMeta(total=total, page=page, size=size)
    )
    return BaseResponse(message="Session students metrics retrieved successfully", data=paginated_data)
