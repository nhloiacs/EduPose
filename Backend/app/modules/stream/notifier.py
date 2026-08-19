from fastapi import WebSocket
from typing import Dict, List, Optional
import asyncio
import json
import logging

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
        # Event loop utama (uvicorn). Dipakai agar thread AI bisa mengirim
        # notifikasi ke WebSocket yang dimiliki loop ini.
        self.loop: Optional[asyncio.AbstractEventLoop] = None

    async def connect(self, websocket: WebSocket, session_id: str):
        self.loop = asyncio.get_running_loop()
        await websocket.accept()
        if session_id not in self.active_connections:
            self.active_connections[session_id] = []
        self.active_connections[session_id].append(websocket)
        logger.info(f"[WebSocket] Client connected to session {session_id}")

    def disconnect(self, websocket: WebSocket, session_id: str):
        if session_id in self.active_connections:
            try:
                self.active_connections[session_id].remove(websocket)
                if not self.active_connections[session_id]:
                    del self.active_connections[session_id]
                logger.info(
                    f"[WebSocket] Client disconnected from session {session_id}"
                )
            except ValueError:
                pass

    async def broadcast_alert(self, session_id: str, message: dict):
        """Mengirim pesan hanya ke client yang berada di session_id tersebut"""
        if session_id in self.active_connections:
            disconnected_clients = []
            for connection in self.active_connections[session_id]:
                try:
                    await connection.send_text(json.dumps(message))
                except Exception as e:
                    logger.warning(f"[WebSocket] Failed to send message: {e}")
                    disconnected_clients.append(connection)
            for dead_conn in disconnected_clients:
                self.disconnect(dead_conn, session_id)

    def broadcast_alert_threadsafe(self, session_id: str, message: dict):
        """Dipanggil dari thread non-async (worker AI kamera).

        Tidak boleh memakai asyncio.run() di sini: itu membuat event loop baru,
        sedangkan WebSocket-nya milik event loop uvicorn, sehingga pesan tidak
        pernah sampai ke client.
        """
        if session_id not in self.active_connections:
            logger.info(
                f"[WebSocket] Tidak ada client yang mendengarkan sesi {session_id}"
            )
            return
        if self.loop is None or self.loop.is_closed():
            logger.warning("[WebSocket] Event loop belum siap, notifikasi dilewati.")
            return
        try:
            future = asyncio.run_coroutine_threadsafe(
                self.broadcast_alert(session_id, message), self.loop
            )
            future.result(timeout=5)
        except Exception as e:
            logger.error(f"[WebSocket] Gagal mengirim notifikasi: {e}")


notifier = ConnectionManager()
