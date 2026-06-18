from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.schemas.auth import LoginRequest, AuthResponse
from app.schemas.base import BaseResponse
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/login", response_model=BaseResponse[AuthResponse])
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """
    Login user dan mendapatkan token akses.
    """
    # Tanpa try-except! Biarkan Global Exception Handler yang menangani error.
    user_data = AuthService.login(db, request.email, request.password)
    
    return BaseResponse(
        message="Login successful", 
        data=AuthResponse(**user_data)
    )