import {
  useEffect,
  useRef,
  useState,
  getMonitorStreamUrl,
  getSessionLiveDetections,
  getUploadFrameWsUrl,
  getNotificationWsUrl,
  getCameraDetail,
} from '../imports';

const DETECTION_POLL_INTERVAL_MS = 3000;

export function useLiveStream({ authToken, setBackendMessage, onNotification }) {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  
  const hiddenVideoRef = useRef(null);
  const uploadWsRef = useRef(null);
  const uploadIntervalRef = useRef(null);
  const localStreamRef = useRef(null);
  const notificationWsRef = useRef(null);

  const [boxes, setBoxes] = useState([]);
  const [streamUrl, setStreamUrl] = useState('');
  const [selectedStreamSessionId, setSelectedStreamSessionId] = useState('');
  const [streamLoading, setStreamLoading] = useState(false);
  const [streamError, setStreamError] = useState('');
  const [liveLog, setLiveLog] = useState([]);
  const [detectedPeople, setDetectedPeople] = useState(0);
  const [detectionStreamActive, setDetectionStreamActive] = useState(false);
  const [detectionError, setDetectionError] = useState('');
  const [isDemoActive, setIsDemoActive] = useState(false);

  // --- LOGIKA POLLING DETEKSI ---
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
        setDetectionStreamActive(false);
        setDetectionError(
          error instanceof Error ? error.message : 'Gagal mengambil hasil deteksi.',
        );
      }
    };
    loadDetections();
    const intervalId = setInterval(loadDetections, DETECTION_POLL_INTERVAL_MS);
    return () => { isActive = false; clearInterval(intervalId); };
  }, [authToken, streamUrl, selectedStreamSessionId]);

  // --- LOGIKA MENGGAMBAR CANVAS ---
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
      if (currentImage) currentImage.onload = null;
    };
  }, [boxes]);

  // ==========================================
  // FUNGSI UTAMA: MEMULAI STREAM & WEBCAM
  // ==========================================
  const handleMonitorStream = async (sessionId, session) => {
    if (!authToken) {
      setBackendMessage('Silakan login untuk melakukan aksi sesi');
      return;
    }

    setStreamError('');
    setStreamLoading(true);
    setBackendMessage('Menghubungkan kamera & memulai stream...');

    try {
      setSelectedStreamSessionId(sessionId);

      // Notifikasi tetap aktif untuk semua jenis kamera
      connectToNotifications(sessionId);

      // ==========================================
      // 1. Ambil informasi kamera dari session
      // ==========================================
      const cameraId = session?.camera_id;

      if (!cameraId) {
        throw new Error('Session tidak memiliki camera_id.');
      }

      const cameraResponse = await getCameraDetail(cameraId, authToken);
      const camera = cameraResponse?.data;

      if (!camera) {
        throw new Error('Data kamera tidak ditemukan.');
      }

      const endpoint = String(camera.endpoint || '').trim();

      console.log('[LIVE STREAM] Camera:', camera);
      console.log('[LIVE STREAM] Endpoint:', endpoint);

      // ==========================================
      // 2. Tentukan jenis kamera
      // ==========================================
      const isWebcam = endpoint.toLowerCase() === 'webcam';

      // ==========================================
      // 3A. WEBCAM
      // ==========================================
      if (isWebcam) {
        setBackendMessage('Meminta akses webcam...');

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: 640,
            height: 480,
          },
        });

        localStreamRef.current = stream;

        if (hiddenVideoRef.current) {
          hiddenVideoRef.current.srcObject = stream;
          await hiddenVideoRef.current.play();
        }

        // ==========================================
        // Upload frame webcam → backend
        // ==========================================
        const wsUrl = getUploadFrameWsUrl(sessionId);
        const ws = new WebSocket(wsUrl);

        uploadWsRef.current = ws;

        ws.onopen = () => {
          setBackendMessage('Webcam terhubung, mengirim frame ke AI...');

          const offscreenCanvas = document.createElement('canvas');
          offscreenCanvas.width = 640;
          offscreenCanvas.height = 480;

          const ctx = offscreenCanvas.getContext('2d');

          uploadIntervalRef.current = setInterval(() => {
            if (
              ws.readyState === WebSocket.OPEN &&
              hiddenVideoRef.current
            ) {
              ctx.drawImage(
                hiddenVideoRef.current,
                0,
                0,
                640,
                480
              );

              offscreenCanvas.toBlob(
                (blob) => {
                  if (
                    blob &&
                    ws.readyState === WebSocket.OPEN
                  ) {
                    ws.send(blob);
                  }
                },
                'image/jpeg',
                0.6
              );
            }
          }, 100);

          // Backend menampilkan hasil anotasi
          setStreamUrl(getMonitorStreamUrl(sessionId));
          setIsDemoActive(true);
        };

        ws.onerror = (err) => {
          console.error('[WEBCAM WS] Error:', err);
          setStreamError(
            'Gagal menyambungkan WebSocket frame ke backend.'
          );
        };
      }

      // ==========================================
      // 3B. RTSP / CAMERA LAIN
      // ==========================================
      else {
        console.log(
          '[LIVE STREAM] Non-webcam camera detected:',
          endpoint
        );

        setBackendMessage('Menghubungkan stream kamera...');

        // PENTING:
        // Tidak ada getUserMedia()
        // Tidak ada upload-frame WebSocket
        // Tidak ada akses kamera laptop

        setStreamUrl(getMonitorStreamUrl(sessionId));
        setIsDemoActive(false);
      }

    } catch (error) {
      console.error('[LIVE STREAM] Error:', error);

      const message =
        error instanceof Error
          ? error.message
          : 'Gagal memulai stream kamera.';

      setStreamError(message);
      setBackendMessage(message);
      setStreamUrl('');
    } finally {
      setStreamLoading(false);
    }
  };

  // --- FUNGSI STOP STREAM ---
  const handleStopStream = () => {
    if (uploadIntervalRef.current) {
      clearInterval(uploadIntervalRef.current);
      uploadIntervalRef.current = null;
    }

    if (uploadWsRef.current) {
      uploadWsRef.current.close();
      uploadWsRef.current = null;
    }

    if (notificationWsRef.current) {
      notificationWsRef.current.close();
      notificationWsRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      localStreamRef.current = null;
    }

    if (hiddenVideoRef.current) {
      hiddenVideoRef.current.srcObject = null;
    }

    setStreamUrl('');
    setStreamError('');
    setIsDemoActive(false);
    setBackendMessage('Stream & Webcam dihentikan.');
  };

  // --- KONEKSI WEBSOCKET NOTIFIKASI ---
  const connectToNotifications = (sessionId) => {
    if (notificationWsRef.current) notificationWsRef.current.close();

    const wsUrl = getNotificationWsUrl(sessionId);
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);

        // Tampilkan sebagai notifikasi (lonceng header + toast)
        onNotification?.(payload);

        if (payload.type === 'ALERT') {
          const audio = new Audio('/alert.mp3');
          audio.play().catch((e) => console.log('Autoplay audio diblokir browser', e));
          setBackendMessage(`⚠️ ${payload.title || 'Peringatan'}: ${payload.message}`);
        }
      } catch (err) {
        console.error('Gagal membaca payload notifikasi', err);
      }
    };

    ws.onerror = () => {
      console.warn('Koneksi notifikasi terputus.');
    };

    notificationWsRef.current = ws;
  };

  const resetLiveState = () => {
    handleStopStream();
    setBoxes([]);
    setSelectedStreamSessionId('');
    setLiveLog([]);
    setDetectedPeople(0);
    setDetectionStreamActive(false);
    setDetectionError('');
  };

  return {
    canvasRef,
    imgRef,
    hiddenVideoRef,
    isDemoActive,
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
