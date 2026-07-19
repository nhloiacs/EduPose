from pydantic import BaseModel, ConfigDict
from typing import Optional, List
import uuid
from datetime import datetime
from app.core.responses import PaginationMeta

class CameraCreate(BaseModel):
    name: str
    endpoint: str

class CameraUpdate(BaseModel):
    name: Optional[str] = None
    endpoint: Optional[str] = None
    status: Optional[str] = None

class CameraRead(BaseModel):
    id: uuid.UUID
    name: str
    endpoint: str
    status: str
    last_ping_at: Optional[datetime]
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# Schema buat dropdown list
class CameraSelectRead(BaseModel):
    id: uuid.UUID
    name: str
    
    model_config = ConfigDict(from_attributes=True)

class PaginatedCameraResponse(BaseModel):
    items: List[CameraRead]
    meta: PaginationMeta
