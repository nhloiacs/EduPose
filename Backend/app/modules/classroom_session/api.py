import uuid
from fastapi import APIRouter, Depends, Query, Body
from sqlalchemy.orm import Session
from typing import Optional
from app.database.database import get_db
from app.core.auth_deps import require_principal, require_principal_or_teacher
from app.core.responses import BaseResponse, PaginationMeta
from app.modules.classroom_session.schema import (
    PaginatedClassroomSessionResponse, ClassroomSessionEditRead, 
    ClassroomSessionDetailRead, ClassroomSessionUpdate
)
from app.modules.classroom_session.service import ClassroomSessionService
from app.modules.classroom_session.schema import PaginatedSessionStudentMetricResponse

router = APIRouter(prefix="/classroom-sessions", tags=["Classroom Sessions"])

def get_teacher_id_from_token(current_user: dict) -> Optional[str]:
    if current_user.get("role") == "teacher":
        return current_user.get("sub")
    return None

@router.get("/", response_model=BaseResponse[PaginatedClassroomSessionResponse], summary="Get all sessions")
def list_sessions(
    page: int = Query(1, gt=0),
    size: int = Query(10, gt=0),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_principal_or_teacher)
):
    teacher_id = get_teacher_id_from_token(current_user)
    items, total = ClassroomSessionService.get_all_sessions(db, page, size, search, teacher_id)
    paginated_data = PaginatedClassroomSessionResponse(
        items=items,
        meta=PaginationMeta(total=total, page=page, size=size)
    )
    return BaseResponse(message="Sessions retrieved successfully", data=paginated_data)

@router.get("/{session_id}/edit", response_model=BaseResponse[ClassroomSessionEditRead], summary="Get session subject for edit")
def get_session_edit(
    session_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_principal_or_teacher)
):
    teacher_id = get_teacher_id_from_token(current_user)
    data = ClassroomSessionService.get_session_edit(db, session_id, teacher_id)
    return BaseResponse(message="Session edit data retrieved", data=data)

@router.get("/{session_id}", response_model=BaseResponse[ClassroomSessionDetailRead], summary="Get session detail")
def get_session_detail(
    session_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_principal_or_teacher)
):
    teacher_id = get_teacher_id_from_token(current_user)
    data = ClassroomSessionService.get_session_detail(db, session_id, teacher_id)
    return BaseResponse(message="Session detail retrieved", data=data)

@router.patch("/{session_id}", response_model=BaseResponse[ClassroomSessionEditRead], summary="Update session subject")
def update_session(
    session_id: uuid.UUID,
    data: ClassroomSessionUpdate = Body(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_principal_or_teacher)
):
    teacher_id = get_teacher_id_from_token(current_user)
    updated_data = ClassroomSessionService.update_session(db, session_id, data, teacher_id)
    return BaseResponse(message="Session subject updated successfully", data=updated_data)

@router.delete("/{session_id}", response_model=BaseResponse[None], summary="Delete a session")
def delete_session(
    session_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_principal_or_teacher)
):
    teacher_id = get_teacher_id_from_token(current_user)
    ClassroomSessionService.delete_session(db, session_id, teacher_id)
    return BaseResponse(message="Session deleted successfully", data=None)

@router.get("/{session_id}/students", response_model=BaseResponse[PaginatedSessionStudentMetricResponse], summary="Get students metrics for a session")
def get_session_students(
    session_id: uuid.UUID,
    page: int = Query(1, gt=0),
    size: int = Query(10, gt=0),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_principal_or_teacher)
):
    teacher_id = get_teacher_id_from_token(current_user)
    items, total = ClassroomSessionService.get_session_students(db, session_id, page, size, search, teacher_id)
    
    paginated_data = PaginatedSessionStudentMetricResponse(
        items=items,
        meta=PaginationMeta(total=total, page=page, size=size)
    )
    return BaseResponse(message="Session students metrics retrieved successfully", data=paginated_data)
