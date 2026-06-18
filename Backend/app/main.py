from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse        
from app.api.auth import router as auth_router
from app.api.teacher import router as teacher_router
from app.api.classroom import router as classroom_router
from app.core.exceptions import BaseAPIException  

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

@app.get("/")
def health():
    return {
        "message": "Running"
    }