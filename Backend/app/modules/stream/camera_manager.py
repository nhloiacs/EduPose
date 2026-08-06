import time
import threading
import logging
import os
import cv2
import uuid
from app.database.database import SessionLocal
from app.models.frame_log import FrameLog
from app.modules.stream.ai_processor import AIProcessor

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
        self.cap = cv2.VideoCapture(0 if self.endpoint == "0" else self.endpoint, cv2.CAP_FFMPEG)
        self.latest_frame = None
        self.detections = []
        self.is_running = True
        self.is_evaluating = False
        # Pembacaan kamera berjalan di thread sendiri supaya frame tetap
        # diperbarui meskipun tidak ada penonton stream. Tanpa ini, menutup
        # halaman atau me-refresh browser akan membekukan `latest_frame`,
        # sehingga evaluasi hanya mencatat frame lama berulang-ulang.
        self.reader_thread = threading.Thread(target=self._reader_loop, daemon=True)
        self.reader_thread.start()
        self.ai_thread = threading.Thread(target=self._ai_worker_loop, daemon=True)
        self.ai_thread.start()

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
        """Frame terbaru beserta kotak hasil deteksi, atau None bila belum ada."""
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
        """
        Hanya mengirim frame ke penonton. Pembacaan kamera dilakukan oleh
        thread reader, sehingga penonton yang terputus tidak menghentikan
        pembacaan maupun evaluasi.
        """
        stream = cls.get_or_create_stream(endpoint, session_id)
        if not stream.cap.isOpened():
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
        """Hasil deteksi terbaru dari AI worker, atau None bila stream mati."""
        stream = cls._active_streams.get(endpoint)
        if not stream:
            return None
        return list(stream.detections)

    @classmethod
    def get_evaluation_state(cls, endpoint: str):
        """None bila stream belum aktif, selain itu True/False."""
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
