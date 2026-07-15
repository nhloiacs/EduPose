import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.modules.auth.schema import LoginRequest, AuthResponse
from app.modules.auth.service import AuthService
from app.modules.teacher.service import TeacherService
from app.core.responses import BaseResponse
from app.core.auth_deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/login", response_model=BaseResponse[AuthResponse])
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """
    Login user dan mendapatkan token akses.
    """
    user_data = AuthService.login(db, request.email, request.password)
    
    return BaseResponse(
        message="Login successful", 
        data=AuthResponse(**user_data)
    )

@router.get("/profile", response_model=BaseResponse, summary="Get current user profile")
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Mengambil profil user yang sedang login.
    Jika role adalah teacher, akan menampilkan detail teacher dengan metrics.
    """
    user_id = uuid.UUID(current_user.get("sub"))
    data = TeacherService.get_teacher_detail(db, user_id)
    return BaseResponse(message="Profile retrieved successfully", data=data)
