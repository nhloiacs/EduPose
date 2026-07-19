import cv2
import time
import threading
import logging
from app.modules.stream.ai_processor import AIProcessor

logger = logging.getLogger(__name__)

class ActiveStream:
    def __init__(self, endpoint):
        self.endpoint = endpoint
        self.cap = cv2.VideoCapture(0 if endpoint == "0" else endpoint)
        self.latest_frame = None
        self.detections = []
        self.is_running = True
        self.ai_thread = threading.Thread(target=self._ai_worker_loop, daemon=True)
        self.ai_thread.start()

    def _ai_worker_loop(self):
        while self.is_running:
            if self.latest_frame is not None:
                frame_to_process = self.latest_frame.copy()
                try:
                    new_detections = AIProcessor.process_frame(frame_to_process)
                    self.detections = new_detections
                except Exception as e:
                    logger.error(f"[AI WORKER] Error processing frame: {e}")
            # Tunggu 5 detik sebelum proses frame berikutnya
            time.sleep(5.0)

    def read_and_draw(self):
        success, frame = self.cap.read()
        if not success:
            return False, None
        self.latest_frame = frame.copy()
        for det in self.detections:
            x1, y1, x2, y2 = det["bbox"]
            cx, cy = det["center"]
            label = det["label"]
            conf = det["confidence"]
            text = f"Student | {label} ({conf*100:.1f}%)"
            color = (0, 255, 0)
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            cv2.putText(frame, text, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
            cv2.circle(frame, (cx, cy), 5, (255, 0, 0), -1)
        return True, frame

    def release(self):
        self.is_running = False
        self.cap.release()


class CameraManager:
    @staticmethod
    def generate_frames(endpoint: str):
        stream = ActiveStream(endpoint)
        if not stream.cap.isOpened():
            logger.error(f"[STREAM] Gagal membuka kamera: {endpoint}")
            return
        logger.info(f"[STREAM] Memulai koneksi ke: {endpoint}")
        try:
            while True:
                success, frame = stream.read_and_draw()
                if not success:
                    logger.warning(f"[STREAM] Frame drop atau putus: {endpoint}")
                    break
                ret, buffer = cv2.imencode('.jpg', frame)
                if not ret:
                    continue
                frame_bytes = buffer.tobytes()
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        finally:
            stream.release()
            logger.info(f"[STREAM] Koneksi ditutup: {endpoint}")
