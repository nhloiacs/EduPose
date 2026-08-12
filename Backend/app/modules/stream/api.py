import uuid
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Path,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.models.classroom_session import ClassroomSession
from app.modules.stream.camera_manager import CameraManager
from app.modules.stream.notifier import notifier

router = APIRouter(prefix="/stream", tags=["Streaming"])


@router.get("/monitor/{session_id}")
def stream_session(
    session_id: uuid.UUID = Path(...),
    db: Session = Depends(get_db),
    # current_user = Depends(require_principal_or_teacher)
):
    session = (
        db.query(ClassroomSession)
        .filter(
            ClassroomSession.id == session_id, ClassroomSession.deleted_at.is_(None)
        )
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Sesi kelas tidak ditemukan.")
    if session.status != "ONGOING":
        raise HTTPException(
            status_code=400, detail="Sesi kelas tidak sedang berlangsung."
        )
    if not session.camera_id or not session.camera:
        raise HTTPException(
            status_code=400, detail="Tidak ada kamera yang terhubung ke sesi ini."
        )
    endpoint = session.camera.endpoint
    return StreamingResponse(
        CameraManager.generate_frames(endpoint, session.id),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


@router.websocket("/notifications/{session_id}")
async def websocket_notifications(websocket: WebSocket, session_id: uuid.UUID):
    session_str = str(session_id)
    await notifier.connect(websocket, session_str)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        notifier.disconnect(websocket, session_str)
