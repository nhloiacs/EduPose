from datetime import datetime, timedelta
from jose import jwt
import bcrypt

from app.core.config import settings

ALGORITHM = "HS256"

def hash_password(password: str) -> str:
    password_bytes = password.encode('utf-8')
    
    hashed_bytes = bcrypt.hashpw(password_bytes, bcrypt.gensalt())
    
    return hashed_bytes.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    password_bytes = plain_password.encode('utf-8')
    hashed_bytes = hashed_password.encode('utf-8')
    
    return bcrypt.checkpw(password_bytes, hashed_bytes)


def create_access_token(data: dict) -> str:
    payload = data.copy()

    expire = datetime.utcnow() + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload.update({"exp": expire})
    
    return jwt.encode(
        payload,
        settings.SECRET_KEY,
        algorithm=ALGORITHM
    )   