from typing import Generic, TypeVar, Optional
from pydantic import BaseModel

T = TypeVar("T")

class BaseResponse(BaseModel, Generic[T]):
    message: str
    data: Optional[T] = None

class PaginationMeta(BaseModel):
    total: int
    page: int
    size: int