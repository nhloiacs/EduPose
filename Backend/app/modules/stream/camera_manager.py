import time
import threading
import logging
import os
import cv2
import uuid
import asyncio
from app.database.database import SessionLocal
from app.models.frame_log import FrameLog
from app.models.classroom_session import ClassroomSession  # <-- TAMBAHAN IMPORT
from app.models.student import Student  # <-- TAMBAHAN IMPORT
from app.modules.stream.ai_processor import AIProcessor
from app.modules.stream.notifier import notifier

logger = logging.getLogger(__name__)

# MediaMTX menerima RTSP melalui TCP. Set sebelum VideoCapture dibuat agar
# backend di Docker tidak mencoba RTP/UDP yang sering gagal pada Windows.
os.environ.setdefault("OPENCV_FFMPEG_CAPTURE_OPTIONS", "rtsp_transport;tcp")

# Batas kegagalan baca berturut-turut sebelum stream dianggap mati.
MAX_READ_FAILURES = 150


def _resolve_camera_endpoint(endpoint: str) -> str:
    """Make a Windows-host RTSP endpoint reachable from the API container."""
    if not os.path.exists("/.dockerenv"):
        return endpoint

    for local_host in ("rtsp://127.0.0.1", "rtsp://localhost"):
        if endpoint.startswith(local_host):
            resolved = endpoint.replace(local_host, "rtsp://host.docker.internal", 1)
            logger.info("[STREAM] Menggunakan endpoint host Docker: %s", resolved)
            return resolved
    return endpoint


class ActiveStream:
    def __init__(self, endpoint, session_id):
        self.endpoint = _resolve_camera_endpoint(endpoint)
        self.session_id = session_id
        self.is_demo_mode = self.endpoint == "webcam"
        self.cap = None

        if not self.is_demo_mode:
            self.cap = cv2.VideoCapture(
                0 if self.endpoint == "0" else self.endpoint, cv2.CAP_FFMPEG
            )

        self.latest_frame = None
        self.detections = []
        self.is_running = True
        self.is_evaluating = False
        self.last_alert_time = 0
        self.COOLDOWN_SECONDS = 180

        # --- HITUNG THRESHOLD DINAMIS ---
        self.DISTRACTED_THRESHOLD = self._calculate_threshold()

        if not self.is_demo_mode:
            self.reader_thread = threading.Thread(target=self._reader_loop, daemon=True)
            self.reader_thread.start()

        self.ai_thread = threading.Thread(target=self._ai_worker_loop, daemon=True)
        self.ai_thread.start()

    def _calculate_threshold(self):
        """Menghitung 1/10 dari total siswa aktif di kelas, minimal 1."""
        db = SessionLocal()
        try:
            session = (
                db.query(ClassroomSession)
                .filter(ClassroomSession.id == self.session_id)
                .first()
            )

            if session and session.classroom_id:
                total_students = (
                    db.query(Student)
                    .filter(
                        Student.classroom_id == session.classroom_id,
                        Student.deleted_at.is_(None),
                    )
                    .count()
                )

                threshold = max(1, total_students // 10)

                logger.info(
                    f"[STREAM] Sesi {self.session_id} - Total Siswa: {total_students}, Threshold Distracted diset ke: {threshold}"
                )
                return threshold

            return 1
        except Exception as e:
            logger.error(f"[STREAM] Gagal menghitung threshold dinamis: {e}")
            return 1
        finally:
            db.close()

    def update_frame(self, frame):
        """Fungsi ini dipanggil oleh WebSocket untuk menimpa frame terbaru"""
        if self.is_running:
            self.latest_frame = frame

    def _reader_loop(self):
        consecutive_failures = 0
        while self.is_running:
            if not self.cap.isOpened():
                consecutive_failures += 1
            else:
                success, frame = self.cap.read()
                if success:
                    consecutive_failures = 0
                    self.latest_frame = frame
                else:
                    consecutive_failures += 1

            if consecutive_failures >= MAX_READ_FAILURES:
                logger.error(
                    "[STREAM] Kamera %s gagal dibaca %s kali berturut-turut, stream dihentikan.",
                    self.endpoint,
                    consecutive_failures,
                )
                self.is_running = False
                break

            time.sleep(0.02 if consecutive_failures == 0 else 0.2)

    def _ai_worker_loop(self):
        while self.is_running:
            if self.latest_frame is not None:
                frame_to_process = self.latest_frame.copy()
                try:
                    new_detections = AIProcessor.process_frame(frame_to_process)
                    self.detections = new_detections
                    if self.is_evaluating and len(new_detections) > 0:
                        self._save_frame_log(new_detections)
                        distracted_count = sum(
                            1 for d in new_detections if d["label"] == "distracted"
                        )
                        if distracted_count >= self.DISTRACTED_THRESHOLD:
                            current_time = time.time()
                            if (
                                current_time - self.last_alert_time
                                >= self.COOLDOWN_SECONDS
                            ):
                                alert_payload = {
                                    "type": "ALERT",
                                    "title": "Perhatian Kelas",
                                    "message": f"Terdeteksi {distracted_count} siswa sedang tidak fokus.",
                                    "distracted_count": distracted_count,
                                    "timestamp": current_time,
                                }
                                asyncio.run(
                                    notifier.broadcast_alert(
                                        str(self.session_id), alert_payload
                                    )
                                )
                                self.last_alert_time = current_time
                                logger.info(
                                    f"[ALERT] Notifikasi dikirim ke guru untuk sesi {self.session_id}"
                                )
                except Exception as e:
                    logger.error(f"[AI WORKER] Error: {e}")
            time.sleep(5.0)

    def _save_frame_log(self, detections):
        db = SessionLocal()
        try:
            log_entry = FrameLog(
                session_id=self.session_id,
                payload=detections,
            )
            db.add(log_entry)
            db.commit()
        except Exception as e:
            logger.error(f"Gagal save frame log: {e}")
        finally:
            db.close()

    def get_annotated_frame(self):
        if self.latest_frame is None:
            return None
        frame = self.latest_frame.copy()
        for det in self.detections:
            x1, y1, x2, y2 = det["bbox"]
            label = det["label"]
            conf = det["confidence"]
            if label == "focus":
                color = (0, 255, 0)  # Hijau (Green)
            elif label == "distracted":
                color = (0, 0, 255)  # Merah (Red)
            elif label == "raise-hand":
                color = (0, 255, 255)  # Kuning (Yellow)
            elif label == "unknown":
                color = (128, 128, 128)  # Abu-abu (Gray) untuk confidence rendah
            else:
                color = (255, 255, 255)  # Putih (Default kalau '?')
            text = f"Student | {label} ({conf * 100:.1f}%)"
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            cv2.putText(
                frame, text, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2
            )
        return frame

    def release(self):
        self.is_running = False
        if self.cap:  # Cek cap dulu biar ga error kalau mode demo
            self.cap.release()


class CameraManager:
    _active_streams = {}

    @classmethod
    def get_or_create_stream(cls, endpoint: str, session_id: uuid.UUID):
        if endpoint not in cls._active_streams:
            cls._active_streams[endpoint] = ActiveStream(endpoint, session_id)
        return cls._active_streams[endpoint]

    @classmethod
    def get_latest_frame(cls, endpoint: str):
        stream = cls._active_streams.get(endpoint)
        if stream and stream.latest_frame is not None:
            return stream.latest_frame.copy()
        return None

    @classmethod
    def generate_frames(cls, endpoint: str, session_id: uuid.UUID):
        stream = cls.get_or_create_stream(endpoint, session_id)

        # Bypass pengecekan kamera isOpened() kalau ini mode demo
        if not stream.is_demo_mode and not stream.cap.isOpened():
            logger.error(f"[STREAM] Gagal membuka kamera: {endpoint}")
            return

        while stream.is_running:
            frame = stream.get_annotated_frame()
            if frame is None:
                time.sleep(0.1)
                continue
            ret, buffer = cv2.imencode(".jpg", frame)
            if not ret:
                continue
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + buffer.tobytes() + b"\r\n"
            )
            time.sleep(0.04)

    @classmethod
    def get_latest_detections(cls, endpoint: str):
        stream = cls._active_streams.get(endpoint)
        if not stream:
            return None
        return list(stream.detections)

    @classmethod
    def get_evaluation_state(cls, endpoint: str):
        stream = cls._active_streams.get(endpoint)
        if not stream:
            return None
        return stream.is_evaluating

    @classmethod
    def stop_stream(cls, endpoint: str):
        stream = cls._active_streams.pop(endpoint, None)
        if stream:
            stream.release()
            logger.info(
                f"[STREAM] Kamera untuk endpoint {endpoint} berhasil dimatikan."
            )
