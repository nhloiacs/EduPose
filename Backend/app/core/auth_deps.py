from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from app.core.config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        return payload 
    except JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

def require_principal(user: dict = Depends(get_current_user)):
    if user.get("role") != "principal":
        raise HTTPException(status_code=403, detail="Not authorized to perform this action")
    return user