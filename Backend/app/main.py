from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse        
from app.core.exceptions import BaseAPIException  
from app.modules.auth.api import router as auth_router
from app.modules.teacher.api import router as teacher_router
from app.modules.classroom.api import router as classroom_router
from app.modules.student.api import router as student_router
from app.modules.classroom_session.api import router as classroom_session_router
from app.modules.dashboard.api import router as dashboard_router

app = FastAPI()

@app.exception_handler(BaseAPIException)
async def custom_exception_handler(request: Request, exc: BaseAPIException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"message": exc.message, "data": None},
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"message": exc.detail, "data": None},
    )

app.include_router(auth_router)
app.include_router(teacher_router)
app.include_router(classroom_router)
app.include_router(student_router)
app.include_router(classroom_session_router)
app.include_router(dashboard_router)

@app.get("/")
def health():
    return {
        "message": "Running"
    }
