from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException

from sqlalchemy.orm import Session

from app.database.database import get_db

from app.schemas.auth import (
    LoginRequest,
    AuthResponse
)

from app.services.auth_service import (
    AuthService
)

router = APIRouter(
    prefix="/auth",
    tags=["Auth"]
)

@router.post(
    "/login",
    response_model=AuthResponse
)
def login(
    request: LoginRequest,
    db: Session = Depends(get_db)
):
    try:
        token = AuthService.login(
            db,
            request.email,
            request.password
        )

        return AuthResponse(
            token=token
        )

    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=str(e)
        )