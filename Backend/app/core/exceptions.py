from fastapi import HTTPException, status


class BaseAPIException(Exception):
    def __init__(self, message: str, status_code: int):
        self.message = message
        self.status_code = status_code


class BadRequestException(HTTPException):
    def __init__(self, detail: str = "Permintaan tidak valid (Bad Request)."):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


class NotFoundException(BaseAPIException):
    def __init__(self, message: str = "Resource not found"):
        super().__init__(message, status_code=404)


class ConflictException(BaseAPIException):
    def __init__(self, message: str = "Resource already exists"):
        super().__init__(message, status_code=409)


class ForbiddenException(BaseAPIException):
    def __init__(self, message: str = "You don't have permission"):
        super().__init__(message, status_code=403)


class UnauthorizedException(BaseAPIException):
    def __init__(self, message: str = "Invalid credentials"):
        super().__init__(message, status_code=401)

