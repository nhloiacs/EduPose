import {
  useEffect,
  useRef,
  useState,
  getMonitorStreamUrl,
  getSessionLiveDetections,
} from '../imports';

const DETECTION_POLL_INTERVAL_MS = 3000;

/**
 * Owns the live camera feed: stream url, detection log and the bounding-box overlay canvas.
 */
export function useLiveStream({ authToken, setBackendMessage }) {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);

  const [boxes, setBoxes] = useState([]);
  const [streamUrl, setStreamUrl] = useState('');
  const [selectedStreamSessionId, setSelectedStreamSessionId] = useState('');
  const [streamLoading, setStreamLoading] = useState(false);
  const [streamError, setStreamError] = useState('');
  const [liveLog, setLiveLog] = useState([]);
  const [detectedPeople, setDetectedPeople] = useState(0);
  const [detectionStreamActive, setDetectionStreamActive] = useState(false);
  const [detectionError, setDetectionError] = useState('');

  /**
   * Panel hasil deteksi diisi dari kamera. Backend menjalankan inferensi tiap
   * 5 detik, jadi polling 3 detik sudah lebih dari cukup.
   */
  useEffect(() => {
    if (!authToken || !streamUrl || !selectedStreamSessionId) return undefined;

    let isActive = true;

    const loadDetections = async () => {
      try {
        const response = await getSessionLiveDetections(selectedStreamSessionId, authToken);
        if (!isActive) return;

        const data = response.data ?? {};
        setDetectionError('');
        setDetectionStreamActive(Boolean(data.stream_active));
        setDetectedPeople(Number(data.detected_people ?? 0));
        setLiveLog(Array.isArray(data.students) ? data.students : []);
      } catch (error) {
        if (!isActive) return;
        // Kegagalan tidak boleh disembunyikan: tanpa pesan, panel kosong akan
        // terlihat seperti "tidak ada siswa" padahal endpointnya yang gagal.
        setDetectionStreamActive(false);
        setDetectionError(
          error instanceof Error ? error.message : 'Gagal mengambil hasil deteksi kamera.',
        );
      }
    };

    loadDetections();
    const intervalId = setInterval(loadDetections, DETECTION_POLL_INTERVAL_MS);

    return () => { isActive = false; clearInterval(intervalId); };
  }, [authToken, streamUrl, selectedStreamSessionId]);

  useEffect(() => {
    const drawCanvas = () => {
      const canvas = canvasRef.current;
      const img = imgRef.current;
      if (!canvas || !img) return;

      const ctx = canvas.getContext('2d');
      const rect = img.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      boxes.forEach((box) => {
        const px = (box.x / 100) * canvas.width;
        const py = (box.y / 100) * canvas.height;
        const pw = (box.w / 100) * canvas.width;
        const ph = (box.h / 100) * canvas.height;

        const mainColor = box.focus ? '#10b981' : '#ef4444';

        ctx.strokeStyle = mainColor;
        ctx.lineWidth = 2;

        const cornerLength = Math.min(pw, ph) * 0.25;

        ctx.beginPath();
        ctx.moveTo(px, py + cornerLength);
        ctx.lineTo(px, py);
        ctx.lineTo(px + cornerLength, py);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(px + pw - cornerLength, py);
        ctx.lineTo(px + pw, py);
        ctx.lineTo(px + pw, py + cornerLength);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(px, py + ph - cornerLength);
        ctx.lineTo(px, py + ph);
        ctx.lineTo(px + cornerLength, py + ph);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(px + pw - cornerLength, py + ph);
        ctx.lineTo(px + pw, py + ph);
        ctx.lineTo(px + pw, py + ph - cornerLength);
        ctx.stroke();

        ctx.fillStyle = box.focus ? 'rgba(16, 185, 129, 0.04)' : 'rgba(239, 68, 68, 0.04)';
        ctx.fillRect(px, py, pw, ph);

        ctx.fillStyle = mainColor;
        const labelText = `${box.name.split(' ')[0]}: ${box.emotion}`;
        ctx.font = 'bold 10px Outfit, sans-serif';
        const textWidth = ctx.measureText(labelText).width;

        ctx.fillRect(px, py - 16, textWidth + 12, 16);

        ctx.fillStyle = '#ffffff';
        ctx.fillText(labelText, px + 6, py - 4);
      });
    };

    const currentImage = imgRef.current;

    if (currentImage?.complete) {
      drawCanvas();
    } else if (currentImage) {
      currentImage.onload = drawCanvas;
    }

    window.addEventListener('resize', drawCanvas);

    return () => {
      window.removeEventListener('resize', drawCanvas);
      if (currentImage) {
        currentImage.onload = null;
      }
    };
  }, [boxes]);

  const handleMonitorStream = async (sessionId) => {
    if (!authToken) {
      setBackendMessage('Silakan login untuk melakukan aksi sesi');
      return;
    }

    setStreamError('');
    setStreamLoading(true);
    setBackendMessage('Memulai stream...');
    try {
      setStreamUrl(getMonitorStreamUrl(sessionId));
      setSelectedStreamSessionId(sessionId);
      setBackendMessage('Stream backend berhasil disiapkan.');
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Gagal memulai stream';
      setStreamError(message);
      setBackendMessage(message);
      setStreamUrl('');
    } finally {
      setStreamLoading(false);
    }
  };

  const handleStopStream = () => {
    setStreamUrl('');
    setStreamError('');
    setBackendMessage('Stream dihentikan.');
  };

  const resetLiveState = () => {
    setBoxes([]);
    setStreamUrl('');
    setStreamError('');
    setSelectedStreamSessionId('');
    setLiveLog([]);
    setDetectedPeople(0);
    setDetectionStreamActive(false);
    setDetectionError('');
  };

  return {
    canvasRef,
    imgRef,
    boxes,
    setBoxes,
    liveLog,
    detectedPeople,
    detectionStreamActive,
    detectionError,
    streamUrl,
    setStreamUrl,
    selectedStreamSessionId,
    setSelectedStreamSessionId,
    streamLoading,
    streamError,
    setStreamError,
    handleMonitorStream,
    handleStopStream,
    resetLiveState,
  };
}

export default useLiveStream;
