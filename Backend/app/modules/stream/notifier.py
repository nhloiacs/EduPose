from fastapi import WebSocket
from typing import Dict, List
import json
import logging

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, session_id: str):
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


notifier = ConnectionManager()
