import uuid
import cv2
import numpy as np
import logging
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

logger = logging.getLogger(__name__)


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


@router.websocket("/upload-frame/{session_id}")
async def websocket_upload_frame(
    websocket: WebSocket, session_id: uuid.UUID, db: Session = Depends(get_db)
):
    await websocket.accept()

    session = (
        db.query(ClassroomSession)
        .filter(
            ClassroomSession.id == session_id, ClassroomSession.deleted_at.is_(None)
        )
        .first()
    )

    if not session or not session.camera_id:
        await websocket.close(code=1008)
        return

    endpoint = session.camera.endpoint
    if endpoint != "webcam":
        await websocket.close(code=1008)
        return

    stream = CameraManager.get_or_create_stream(endpoint, session_id)

    try:
        while True:
            data = await websocket.receive_bytes()
            np_arr = np.frombuffer(data, np.uint8)
            frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

            if frame is not None:
                stream.update_frame(frame)

    except WebSocketDisconnect:
        logger.info(f"[WS] Frontend berhenti mengirim frame untuk sesi {session_id}")
    except Exception as e:
        logger.error(f"[WS] Error pada upload frame: {e}")
