import { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  Video, 
  Users, 
  BarChart3, 
  Search, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Award, 
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  Settings,
  Cpu,
  Save
} from 'lucide-react';
import { Line, Bar } from 'react-chartjs-2';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import {
  buildTeacherProfile,
  checkBackendHealth,
  clearStoredSession,
  listCollection,
  loginRequest,
  mergeBoxesFromStudents,
  mergeStudentsFromBackend,
  persistSession,
  readStoredSession,
} from './lib/backendApi';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Initial Mock Data
const INITIAL_STUDENTS = [
  { id: 1, name: "Andi Pratama", class: "X-A", attention: 92, emotion: "Senang", status: "Aktif", trend: "up" },
  { id: 2, name: "Budi Santoso", class: "X-A", attention: 45, emotion: "Bosan", status: "Aktif", trend: "down" },
  { id: 3, name: "Citra Dewi", class: "X-B", attention: 87, emotion: "Netral", status: "Aktif", trend: "up" },
  { id: 4, name: "Dian Sari", class: "X-B", attention: 38, emotion: "Mengantuk", status: "Aktif", trend: "down" },
  { id: 5, name: "Eka Putri", class: "XI-A", attention: 95, emotion: "Senang", status: "Aktif", trend: "up" },
  { id: 6, name: "Fajar Rahman", class: "XI-A", attention: 55, emotion: "Bingung", status: "Aktif", trend: "down" },
  { id: 7, name: "Gita Ayu", class: "XI-B", attention: 78, emotion: "Netral", status: "Aktif", trend: "up" },
  { id: 8, name: "Hadi Wijaya", class: "XI-B", attention: 82, emotion: "Senang", status: "Aktif", trend: "up" },
  { id: 9, name: "Indah Permata", class: "XII-A", attention: 63, emotion: "Bosan", status: "Aktif", trend: "up" },
  { id: 10, name: "Joko Susilo", class: "XII-A", attention: 71, emotion: "Netral", status: "Tidak Aktif", trend: "up" },
  { id: 11, name: "Kartika Sari", class: "XII-B", attention: 88, emotion: "Senang", status: "Aktif", trend: "up" },
  { id: 12, name: "Lulu Hernawan", class: "XII-B", attention: 42, emotion: "Mengantuk", status: "Aktif", trend: "down" }
];

const INITIAL_WARNINGS = [
  { id: 1, studentId: 2, name: "Budi Santoso", desc: "Tidak fokus > 10 menit", time: "2 menit lalu" },
  { id: 2, studentId: 4, name: "Dian Sari", desc: "Terdeteksi mengantuk", time: "6 menit lalu" },
  { id: 3, studentId: 12, name: "Lulu Hernawan", desc: "Terdeteksi mengantuk", time: "12 menit lalu" }
];

const WEB_SOCKET_URL = import.meta.env.VITE_WEBSOCKET_URL?.trim() ?? '';

const formatAlertTime = (timestamp) => {
  if (!timestamp) return 'Baru saja';

  const parsedTime = new Date(timestamp);
  if (Number.isNaN(parsedTime.getTime())) return 'Baru saja';

  return parsedTime.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const normalizeWebSocketWarning = (payload) => {
  if (!payload || typeof payload !== 'object') {
    return {
      name: 'Notifikasi Sistem',
      desc: typeof payload === 'string' ? payload : 'Pembaruan websocket diterima',
      time: 'Baru saja',
    };
  }

  const studentName = payload.name || payload.studentName || payload.student || payload.title;
  const message = payload.desc || payload.message || payload.text || payload.alert || payload.status;

  return {
    name: studentName || 'Notifikasi Sistem',
    desc: message || 'Pembaruan websocket diterima',
    time: formatAlertTime(payload.time || payload.timestamp || payload.createdAt),
  };
};

const INITIAL_CAMERA_BOXES = [
  { name: "Andi Pratama", x: 12, y: 15, w: 10, h: 15, focus: true, emotion: "Senang" },
  { name: "Budi Santoso", x: 28, y: 18, w: 9, h: 15, focus: false, emotion: "Bosan" },
  { name: "Citra Dewi", x: 45, y: 16, w: 10, h: 15, focus: true, emotion: "Netral" },
  { name: "Dian Sari", x: 62, y: 20, w: 9, h: 15, focus: false, emotion: "Mengantuk" },
  { name: "Eka Putri", x: 80, y: 15, w: 10, h: 15, focus: true, emotion: "Senang" },
  { name: "Fajar Rahman", x: 20, y: 45, w: 11, h: 18, focus: false, emotion: "Bingung" },
  { name: "Gita Ayu", x: 48, y: 42, w: 11, h: 18, focus: true, emotion: "Netral" },
  { name: "Hadi Wijaya", x: 74, y: 44, w: 11, h: 18, focus: true, emotion: "Senang" }
];

export default function App() {
  const storedSession = readStoredSession();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [students, setStudents] = useState(INITIAL_STUDENTS);
  const [warnings, setWarnings] = useState(INITIAL_WARNINGS);
  const [backendClassrooms, setBackendClassrooms] = useState([]);
  const [backendTeachers, setBackendTeachers] = useState([]);
  const [authToken, setAuthToken] = useState(storedSession.token);
  const [currentUser, setCurrentUser] = useState(storedSession.user);
  const [syncState, setSyncState] = useState(storedSession.token ? 'loading' : 'idle');
  const [backendMessage, setBackendMessage] = useState(storedSession.token ? 'Mencoba sinkronisasi data backend...' : 'Belum login ke backend');
  const [backendHealthState, setBackendHealthState] = useState('checking');
  const [backendHealthMessage, setBackendHealthMessage] = useState('Memeriksa backend...');
  const [loginError, setLoginError] = useState('');
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
  });
  
  // Real-time camera feed state and canvas ref
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const websocketRef = useRef(null);
  const [liveLog, setLiveLog] = useState(() =>
    INITIAL_CAMERA_BOXES.map(box => ({
      name: box.name,
      status: box.focus ? 'Attentive' : 'Not Attentive',
    }))
  );
  const [connectionState, setConnectionState] = useState(WEB_SOCKET_URL ? 'connecting' : 'mock');
  
  // Profile settings state
  const [profileData, setProfileData] = useState({
    name: "Ahmad Dahlan, S.Pd.",
    email: "",
    role: "teacher",
    nip: "19670812 199203 1 002",
    school: "SMA Negeri 1 Jakarta",
    subject: "Matematika & Wali Kelas X-A",
    deviceIP: "192.168.1.15",
    deviceName: "Raspberry Pi 4 Model B (8GB)",
    cameraRes: "1080p, 30fps",
    detectionModel: "MobileNetV2 + SSD (Emotion & Attention Classifier)",
    autoRecord: true,
    pushNotification: true,
    sleepThreshold: 45,
    unfocusThreshold: 10,
    photoFilepath: '',
    avatarInitials: 'AD'
  });

  const [showToast, setShowToast] = useState(false);

  // Class rankings data derived from students
  const classStats = [
    { name: "X-A", value: 92, trend: "up" },
    { name: "X-B", value: 87, trend: "up" },
    { name: "XI-A", value: 84, trend: "down" },
    { name: "XI-B", value: 78, trend: "down" },
    { name: "XII-A", value: 75, trend: "down" },
    { name: "XII-B", value: 71, trend: "down" }
  ];

  // Dynamic fluctuation state for bounding boxes
  const [boxes, setBoxes] = useState(INITIAL_CAMERA_BOXES);

  // Live Camera Feed Simulator Loop
  useEffect(() => {
    // Fluctuate sizes and boxes to simulate active computer vision tracking
    const updateCoordinates = () => {
      setBoxes(prev => prev.map(box => {
        // Random drift (-0.2% to +0.2%)
        const dx = (Math.random() - 0.5) * 0.4;
        const dy = (Math.random() - 0.5) * 0.4;
        const dw = (Math.random() - 0.5) * 0.2;
        const dh = (Math.random() - 0.5) * 0.2;
        
        return {
          ...box,
          x: Math.max(5, Math.min(85, box.x + dx)),
          y: Math.max(5, Math.min(80, box.y + dy)),
          w: Math.max(8, Math.min(15, box.w + dw)),
          h: Math.max(12, Math.min(22, box.h + dh))
        };
      }));
    };

    const intervalId = setInterval(updateCoordinates, 150);

    // Every 8 seconds, simulate a student shifting attention or emotion
    let stateIntervalId;
    if (!WEB_SOCKET_URL) {
      stateIntervalId = setInterval(() => {
        setBoxes(prev => {
          const indexToChange = Math.floor(Math.random() * prev.length);
          const updated = [...prev];
          const current = updated[indexToChange];
          
          // Toggle focus
          const nextFocus = !current.focus;
          let nextEmotion = "Netral";
          if (nextFocus) {
            nextEmotion = Math.random() > 0.5 ? "Senang" : "Netral";
          } else {
            const rand = Math.random();
            nextEmotion = rand < 0.33 ? "Bosan" : (rand < 0.66 ? "Mengantuk" : "Bingung");
          }

          updated[indexToChange] = {
            ...current,
            focus: nextFocus,
            emotion: nextEmotion
          };

          // Update live results sidebar
          setLiveLog(updated.map(b => ({
            name: b.name,
            status: b.focus ? "Attentive" : "Not Attentive"
          })));

          // Update main students table data if matching
          setStudents(sPrev => sPrev.map(st => {
            if (st.name === current.name) {
              const diff = nextFocus ? 5 : -5;
              const newAtt = Math.max(20, Math.min(100, st.attention + diff));
              return {
                ...st,
                attention: newAtt,
                emotion: nextEmotion,
                trend: nextFocus ? "up" : "down"
              };
            }
            return st;
          }));

          // Add warning alert if student became not attentive
          if (!nextFocus) {
            const timestamp = "Baru saja";
            const alertsList = [
              "Terdeteksi bosan",
              "Terdeteksi bingung",
              "Terdeteksi mengantuk",
              "Tidak fokus > 5 menit"
            ];
            const randomAlertDesc = nextEmotion === "Mengantuk" ? "Terdeteksi mengantuk" : 
                                    (nextEmotion === "Bosan" ? "Terdeteksi bosan" : alertsList[Math.floor(Math.random() * alertsList.length)]);
            
            setWarnings(wPrev => [
              { id: Date.now(), studentId: 999, name: current.name, desc: randomAlertDesc, time: timestamp },
              ...wPrev.slice(0, 5) // Keep last 6 warnings
            ]);
          }

          return updated;
        });
      }, 7000);
    }

    // Draw loops on canvas
    const drawCanvas = () => {
      const canvas = canvasRef.current;
      const img = imgRef.current;
      if (!canvas || !img) return;

      const ctx = canvas.getContext('2d');
      // Set canvas size to match image layout size
      const rect = img.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      boxes.forEach(box => {
        // Calculate coordinate in pixels
        const px = (box.x / 100) * canvas.width;
        const py = (box.y / 100) * canvas.height;
        const pw = (box.w / 100) * canvas.width;
        const ph = (box.h / 100) * canvas.height;

        // Choose color based on focus (matching success/danger theme)
        const mainColor = box.focus ? '#10b981' : '#ef4444'; 
        
        // Draw bounding box
        ctx.strokeStyle = mainColor;
        ctx.lineWidth = 2;
        
        // Draw standard corners style (CV HUD style)
        const cornerLength = Math.min(pw, ph) * 0.25;
        
        // Top-Left
        ctx.beginPath();
        ctx.moveTo(px, py + cornerLength);
        ctx.lineTo(px, py);
        ctx.lineTo(px + cornerLength, py);
        ctx.stroke();

        // Top-Right
        ctx.beginPath();
        ctx.moveTo(px + pw - cornerLength, py);
        ctx.lineTo(px + pw, py);
        ctx.lineTo(px + pw, py + cornerLength);
        ctx.stroke();

        // Bottom-Left
        ctx.beginPath();
        ctx.moveTo(px, py + ph - cornerLength);
        ctx.lineTo(px, py + ph);
        ctx.lineTo(px + cornerLength, py + ph);
        ctx.stroke();

        // Bottom-Right
        ctx.beginPath();
        ctx.moveTo(px + pw - cornerLength, py + ph);
        ctx.lineTo(px + pw, py + ph);
        ctx.lineTo(px + pw, py + ph - cornerLength);
        ctx.stroke();

        // Semi-transparent box background
        ctx.fillStyle = box.focus ? 'rgba(16, 185, 129, 0.04)' : 'rgba(239, 68, 68, 0.04)';
        ctx.fillRect(px, py, pw, ph);

        // Draw label background
        ctx.fillStyle = mainColor;
        const labelText = `${box.name.split(' ')[0]}: ${box.emotion}`;
        ctx.font = 'bold 10px Outfit, sans-serif';
        const textWidth = ctx.measureText(labelText).width;
        
        ctx.fillRect(px, py - 16, textWidth + 12, 16);

        // Draw text
        ctx.fillStyle = '#ffffff';
        ctx.fillText(labelText, px + 6, py - 4);
      });
    };

    // Trigger canvas draw after image is loaded or immediately
    if (imgRef.current && imgRef.current.complete) {
      drawCanvas();
    } else if (imgRef.current) {
      imgRef.current.onload = drawCanvas;
    }

    // Window resize listener
    window.addEventListener('resize', drawCanvas);

    // Run drawing loop periodically as coordinates fluctuate
    const animationInterval = setInterval(drawCanvas, 150);

    return () => {
      clearInterval(intervalId);
      if (stateIntervalId) {
        clearInterval(stateIntervalId);
      }
      clearInterval(animationInterval);
      window.removeEventListener('resize', drawCanvas);
    };
  }, [boxes]);

  useEffect(() => {
    if (!WEB_SOCKET_URL) {
      return undefined;
    }

    const socket = new WebSocket(WEB_SOCKET_URL);
    websocketRef.current = socket;

    socket.onopen = () => {
      setConnectionState('connected');
    };

    socket.onmessage = (event) => {
      let payload = event.data;

      if (typeof event.data === 'string') {
        try {
          payload = JSON.parse(event.data);
        } catch {
          payload = event.data;
        }
      }

      const nextWarning = normalizeWebSocketWarning(payload);

      setWarnings(previousWarnings => [
        {
          id: Date.now(),
          studentId: payload?.studentId || payload?.id || 0,
          name: nextWarning.name,
          desc: nextWarning.desc,
          time: nextWarning.time,
        },
        ...previousWarnings.slice(0, 5),
      ]);
    };

    socket.onerror = () => {
      setConnectionState('error');
    };

    socket.onclose = () => {
      setConnectionState('closed');
    };

    return () => {
      socket.close();
      websocketRef.current = null;
    };
  }, []);

  useEffect(() => {
    setProfileData(previousProfile => buildTeacherProfile(currentUser, previousProfile));
  }, [currentUser]);

  useEffect(() => {
    let isActive = true;

    const verifyBackendHealth = async () => {
      setBackendHealthState('checking');
      setBackendHealthMessage('Memeriksa backend...');

      try {
        await checkBackendHealth();

        if (!isActive) {
          return;
        }

        setBackendHealthState('online');
        setBackendHealthMessage('Backend aktif');
      } catch (error) {
        if (!isActive) {
          return;
        }

        setBackendHealthState('offline');
        setBackendHealthMessage(error instanceof Error ? error.message : 'Backend tidak dapat dijangkau');
      }
    };

    verifyBackendHealth();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    const loadBackendData = async () => {
      if (!authToken) {
        setSyncState('idle');
        setBackendMessage('Belum login ke backend');
        return;
      }

      setSyncState('loading');
      setBackendMessage('Mengambil siswa, kelas, dan guru dari backend...');

      try {
        const [studentsResponse, classroomsResponse, teachersResponse] = await Promise.all([
          listCollection('/students', authToken, { page: 1, size: 100 }),
          listCollection('/classrooms', authToken, { page: 1, size: 100 }),
          listCollection('/teachers', authToken, { page: 1, size: 100 }),
        ]);

        if (!isActive) {
          return;
        }

        const remoteStudents = studentsResponse?.data?.items ?? [];
        const remoteClassrooms = classroomsResponse?.data?.items ?? [];
        const remoteTeachers = teachersResponse?.data?.items ?? [];

        const mergedStudents = mergeStudentsFromBackend(remoteStudents, INITIAL_STUDENTS);
        const mergedBoxes = mergeBoxesFromStudents(mergedStudents, INITIAL_CAMERA_BOXES);

        setStudents(mergedStudents);
        setBoxes(mergedBoxes);
        setBackendClassrooms(remoteClassrooms);
        setBackendTeachers(remoteTeachers);
        setSyncState('connected');
        setBackendMessage(`Sinkron ${remoteStudents.length} siswa, ${remoteClassrooms.length} kelas, dan ${remoteTeachers.length} guru.`);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setSyncState('error');
        setBackendMessage(error instanceof Error ? error.message : 'Gagal sinkron ke backend');
      }
    };

    loadBackendData();

    return () => {
      isActive = false;
    };
  }, [authToken]);

  // Derived Metrics
  const totalStudentsCount = students.length;
  const focusedCount = students.filter(s => s.attention >= 70).length;
  const unfocusedCount = students.filter(s => s.attention < 70).length;
  const alertCount = warnings.length;
  const classroomFilterOptions = backendClassrooms.length > 0
    ? backendClassrooms.map((classroom) => classroom.name).filter(Boolean)
    : ['X-A', 'X-B', 'XI-A', 'XI-B', 'XII-A', 'XII-B'];

  const handleLoginSubmit = async (event) => {
    event.preventDefault();
    setLoginError('');
    setSyncState('loading');
    setBackendMessage('Login ke backend...');

    try {
      const response = await loginRequest(loginForm.email.trim(), loginForm.password);
      const sessionUser = response?.data ?? null;
      const token = sessionUser?.token ?? '';

      if (!token) {
        throw new Error('Token login tidak ditemukan.');
      }

      persistSession({ token, user: sessionUser });
      setAuthToken(token);
      setCurrentUser(sessionUser);
      setLoginForm(previousForm => ({
        ...previousForm,
        password: '',
      }));
      setActiveTab('dashboard');
      setBackendMessage('Login berhasil. Menyinkronkan data backend...');
    } catch (error) {
      setSyncState('error');
      setBackendMessage('Login gagal');
      setLoginError(error instanceof Error ? error.message : 'Login gagal');
    }
  };

  const handleLogout = () => {
    clearStoredSession();
    setAuthToken('');
    setCurrentUser(null);
    setBackendClassrooms([]);
    setBackendTeachers([]);
    setSyncState('idle');
    setBackendMessage('Belum login ke backend');
    setStudents(INITIAL_STUDENTS);
    setWarnings(INITIAL_WARNINGS);
    setBoxes(INITIAL_CAMERA_BOXES);
  };

  // Save Config Handlers
  const handleSaveProfile = (e) => {
    e.preventDefault();
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Chart Data Configurations
  // 1. Dashboard: Tren Atensi Harian
  const dailyAttentionData = {
    labels: ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'],
    datasets: [
      {
        label: 'Tingkat Atensi (%)',
        data: [88, 85, 74, 81, 72, 54, 73, 66, 58],
        fill: true,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.06)',
        tension: 0.4,
        borderWidth: 3,
        pointBackgroundColor: '#6366f1',
        pointHoverRadius: 6,
      }
    ]
  };

  const dailyAttentionOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1e1b4b',
        titleFont: { family: 'Outfit', size: 13 },
        bodyFont: { family: 'Outfit', size: 12 },
        padding: 10,
        cornerRadius: 8,
      }
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        grid: { color: '#f1f5f9' },
        ticks: { font: { family: 'Outfit', size: 11 }, color: '#64748b' }
      },
      x: {
        grid: { display: false },
        ticks: { font: { family: 'Outfit', size: 11 }, color: '#64748b' }
      }
    }
  };

  // 2. Dashboard: Distribusi Emosi (Donut)
  const emotionDistributionData = {
    labels: ['Senang', 'Netral', 'Bosan', 'Bingung', 'Mengantuk'],
    datasets: [
      {
        data: [
          students.filter(s => s.emotion === "Senang").length,
          students.filter(s => s.emotion === "Netral").length,
          students.filter(s => s.emotion === "Bosan").length,
          students.filter(s => s.emotion === "Bingung").length,
          students.filter(s => s.emotion === "Mengantuk").length,
        ],
        backgroundColor: ['#10b981', '#6366f1', '#f59e0b', '#f43f5e', '#8b5cf6'],
        borderWidth: 0,
        hoverOffset: 4
      }
    ]
  };

  const emotionDonutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1e1b4b',
        bodyFont: { family: 'Outfit', size: 12 },
        padding: 10,
        cornerRadius: 8,
      }
    }
  };

  // 3. Dashboard: Atensi Mingguan (Grouped Bar)
  const weeklyAttentionData = {
    labels: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'],
    datasets: [
      {
        label: 'Fokus',
        data: [82, 75, 88, 70, 85, 62, 0],
        backgroundColor: '#6366f1',
        borderRadius: 6,
        barThickness: 16,
      },
      {
        label: 'Tidak Fokus',
        data: [18, 25, 12, 30, 15, 38, 0],
        backgroundColor: '#f59e0b',
        borderRadius: 6,
        barThickness: 16,
      }
    ]
  };

  const weeklyAttentionOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { font: { family: 'Outfit', size: 12 }, boxWidth: 12, boxHeight: 12 }
      },
      tooltip: {
        backgroundColor: '#1e1b4b',
        titleFont: { family: 'Outfit' },
        bodyFont: { family: 'Outfit' },
        padding: 10,
      }
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        grid: { color: '#f1f5f9' },
        ticks: { font: { family: 'Outfit', size: 11 }, color: '#64748b' }
      },
      x: {
        grid: { display: false },
        ticks: { font: { family: 'Outfit', size: 11 }, color: '#64748b' }
      }
    }
  };

  // 4. Reports: Tren Atensi Harian (Multi-line Focus vs Tidak Fokus)
  const reportsDailyTrendData = {
    labels: ['01 Apr', '02 Apr', '03 Apr', '04 Apr', '05 Apr'],
    datasets: [
      {
        label: 'Fokus %',
        data: [81.4, 83.2, 85.0, 78.5, 84.8],
        borderColor: '#6366f1',
        backgroundColor: 'transparent',
        tension: 0.35,
        borderWidth: 3,
        pointBackgroundColor: '#6366f1',
      },
      {
        label: 'Tidak Fokus %',
        data: [18.6, 21.8, 15.0, 26.5, 15.2],
        borderColor: '#f59e0b',
        backgroundColor: 'transparent',
        tension: 0.35,
        borderWidth: 3,
        pointBackgroundColor: '#f59e0b',
      }
    ]
  };

  const reportsDailyTrendOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { font: { family: 'Outfit', size: 12 } }
      },
      tooltip: { backgroundColor: '#1e1b4b' }
    },
    scales: {
      y: { min: 0, max: 100, grid: { color: '#f1f5f9' } },
      x: { grid: { display: false } }
    }
  };

  // 5. Reports: Perbandingan Atensi per Kelas (Bar)
  const reportsClassComparisonData = {
    labels: ['X-A', 'X-B', 'XI-A', 'XI-B', 'XII-A', 'XII-B'],
    datasets: [
      {
        label: 'Rata-rata Atensi (%)',
        data: [89, 78, 82, 75, 71, 68],
        backgroundColor: '#6366f1',
        borderRadius: 8,
        barThickness: 32,
      }
    ]
  };

  const reportsClassComparisonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: '#1e1b4b' }
    },
    scales: {
      y: { min: 0, max: 100, grid: { color: '#f1f5f9' } },
      x: { grid: { display: false } }
    }
  };

  // 6. Reports: Tren Emosi Harian (Stacked Bar)
  const reportsEmotionTrendData = {
    labels: ['01 Apr', '02 Apr', '03 Apr', '04 Apr', '05 Apr'],
    datasets: [
      {
        label: 'Senang',
        data: [40, 36, 45, 30, 50],
        backgroundColor: '#10b981',
        barThickness: 24,
      },
      {
        label: 'Netral',
        data: [25, 28, 22, 25, 26],
        backgroundColor: '#6366f1',
        barThickness: 24,
      },
      {
        label: 'Bosan',
        data: [20, 18, 15, 23, 14],
        backgroundColor: '#f59e0b',
        barThickness: 24,
      },
      {
        label: 'Bingung',
        data: [10, 12, 10, 14, 6],
        backgroundColor: '#f43f5e',
        barThickness: 24,
      },
      {
        label: 'Mengantuk',
        data: [5, 6, 8, 8, 4],
        backgroundColor: '#8b5cf6',
        barThickness: 24,
      }
    ]
  };

  const reportsEmotionTrendOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { font: { family: 'Outfit', size: 11 }, boxWidth: 10, boxHeight: 10 }
      },
      tooltip: { backgroundColor: '#1e1b4b' }
    },
    scales: {
      y: { stacked: true, min: 0, max: 100, grid: { color: '#f1f5f9' } },
      x: { stacked: true, grid: { display: false } }
    }
  };

  // Student list search/filter logic
  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          student.class.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = classFilter === 'All' ? true : student.class === classFilter;
    const matchesStatus = statusFilter === 'All' ? true : student.status === statusFilter;
    return matchesSearch && matchesClass && matchesStatus;
  });

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <Award size={26} />
          <span className="logo-text">AttentionAI</span>
        </div>
        
        <nav className="sidebar-menu">
          <button 
            className={`menu-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard size={20} />
            <span className="menu-label">Dashboard</span>
          </button>

          <button 
            className={`menu-item ${activeTab === 'live' ? 'active' : ''}`}
            onClick={() => setActiveTab('live')}
          >
            <Video size={20} />
            <span className="menu-label">Live Camera</span>
          </button>

          <button 
            className={`menu-item ${activeTab === 'students' ? 'active' : ''}`}
            onClick={() => setActiveTab('students')}
          >
            <Users size={20} />
            <span className="menu-label">Siswa</span>
          </button>

          <button 
            className={`menu-item ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            <BarChart3 size={20} />
            <span className="menu-label">Laporan</span>
          </button>

          <button 
            className={`menu-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <User size={20} />
            <span className="menu-label">Profil Guru</span>
          </button>
        </nav>

        {/* Profile Avatar Entry point at bottom */}
        <div 
          className="sidebar-profile"
          onClick={() => setActiveTab('profile')}
        >
          <div className="avatar-wrapper">
            <span style={{fontWeight: 700, fontSize: '0.85rem'}}>{profileData.avatarInitials}</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        
        {/* Top Header */}
        <header className="header">
          <div className="welcome-section">
            <h1>
              {activeTab === 'dashboard' && 'Dashboard'}
              {activeTab === 'live' && 'Live Camera Feed'}
              {activeTab === 'students' && 'Data Siswa'}
              {activeTab === 'reports' && 'Laporan Atensi & Emosi'}
              {activeTab === 'profile' && 'Profil & Pengaturan Sistem'}
            </h1>
            <p>
              {activeTab === 'dashboard' && 'Selamat datang! Berikut ringkasan data atensi siswa hari ini.'}
              {activeTab === 'live' && 'Pemantauan kelas real-time dengan model deteksi AI Raspberry Pi.'}
              {activeTab === 'students' && 'Daftar siswa beserta metrik atensi dan emosi real-time.'}
              {activeTab === 'reports' && 'Analisis tren atensi dan distribusi emosi siswa secara historis.'}
              {activeTab === 'profile' && 'Kelola biodata pengajar, status Raspberry Pi, dan threshold model AI.'}
            </p>
          </div>

          <div className="header-actions">
            <div className="search-bar">
              <Search size={18} color="#64748b" />
              <input 
                type="text" 
                placeholder="Search Student/Class/Attention..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className={`connection-status connection-${connectionState}`}>
              <span className="connection-dot" />
              <div className="connection-copy">
                <span className="connection-label">WebSocket</span>
                <strong>
                  {connectionState === 'connected' && 'Terhubung'}
                  {connectionState === 'connecting' && 'Menghubungkan'}
                  {connectionState === 'error' && 'Gagal konek'}
                  {connectionState === 'closed' && 'Terputus'}
                  {connectionState === 'mock' && 'Simulasi lokal'}
                </strong>
              </div>
            </div>
          </div>
        </header>

        {/* Global Summary Cards */}
        {activeTab !== 'reports' && activeTab !== 'profile' && (
          <section className="metrics-grid">
            <div className="metric-card">
              <div className="metric-icon-wrapper total">
                <Users size={22} />
              </div>
              <div className="metric-details">
                <div className="metric-label">Total Siswa</div>
                <div className="metric-value-container">
                  <div className="metric-value">{totalStudentsCount}</div>
                  <div className="metric-change up">+2</div>
                </div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon-wrapper fokus">
                <CheckCircle size={22} />
              </div>
              <div className="metric-details">
                <div className="metric-label">Fokus</div>
                <div className="metric-value-container">
                  <div className="metric-value">{focusedCount}</div>
                  <div className="metric-change up">+6%</div>
                </div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon-wrapper tidak-fokus">
                <XCircle size={22} />
              </div>
              <div className="metric-details">
                <div className="metric-label">Tidak Fokus</div>
                <div className="metric-value-container">
                  <div className="metric-value">{unfocusedCount}</div>
                  <div className="metric-change down">-3%</div>
                </div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon-wrapper peringatan">
                <AlertTriangle size={22} />
              </div>
              <div className="metric-details">
                <div className="metric-label">Peringatan</div>
                <div className="metric-value-container">
                  <div className="metric-value">{alertCount}</div>
                  <div className="metric-change up">+1</div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* VIEW 1: DASHBOARD VIEW */}
        {activeTab === 'dashboard' && (
          <div className="view-panel">
            <div className="dashboard-grid">
              
              {/* Daily Attention Trend Line Chart */}
              <div className="dashboard-card">
                <div className="card-header">
                  <div>
                    <h2 className="card-title">Tren Atensi Harian</h2>
                    <p className="card-subtitle">Grafik rata-rata tingkat kefokusan siswa sepanjang hari ini</p>

              <div className={`connection-status connection-${backendHealthState === 'online' ? 'connected' : backendHealthState === 'checking' ? 'connecting' : 'error'}`}>
                <span className="connection-dot" />
                <div className="connection-copy">
                  <span className="connection-label">Backend API</span>
                  <strong>
                    {backendHealthState === 'online' && 'Backend aktif'}
                    {backendHealthState === 'checking' && 'Memeriksa'}
                    {backendHealthState === 'offline' && 'Backend tidak aktif'}
                  </strong>
                </div>
              </div>
                  </div>
                  <p className="card-subtitle" style={{ marginTop: '6px' }}>{backendHealthMessage}</p>
                </div>
                <div style={{ height: '280px', position: 'relative' }}>
                  <Line data={dailyAttentionData} options={dailyAttentionOptions} />
                </div>
              </div>

              {/* Emotion Donut Chart */}
              <div className="dashboard-card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="card-header">
                  <div>
                    <h2 className="card-title">Distribusi Emosi</h2>
                    <p className="card-subtitle">Persentase ekspresi siswa terdeteksi</p>
                  </div>
                </div>
                <div style={{ height: '180px', position: 'relative', flex: 1 }}>
                  <Doughnut data={emotionDistributionData} options={emotionDonutOptions} />
                </div>
                
                {/* Custom Styled Legends */}
                <div className="custom-legend">
                  {emotionDistributionData.labels.map((label, idx) => (
                    <div key={label} className="legend-item">
                      <span 
                        className="legend-color" 
                        style={{ backgroundColor: emotionDistributionData.datasets[0].backgroundColor[idx] }}
                      />
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            <div className="dashboard-grid">
              
              {/* Weekly Bar Chart */}
              <div className="dashboard-card">
                <div className="card-header">
                  <div>
                    <h2 className="card-title">Atensi Mingguan</h2>
                    <p className="card-subtitle">Perbandingan status fokus harian</p>
                  </div>
                </div>
                <div style={{ height: '280px', position: 'relative' }}>
                  <Bar data={weeklyAttentionData} options={weeklyAttentionOptions} />
                </div>
              </div>

              {/* Class Rankings & Recent Warnings in sidebar block */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* Class Rankings */}
                <div className="dashboard-card">
                  <div className="card-header">
                    <div>
                      <h2 className="card-title">Peringkat Kelas</h2>
                      <p className="card-subtitle">Tingkat atensi tertinggi per kelas</p>
                    </div>
                  </div>
                  <div className="rankings-list">
                    {classStats.map((item, idx) => (
                      <div className="rank-item" key={item.name}>
                        <span className="rank-number">#{idx + 1}</span>
                        <span className="rank-name">{item.name}</span>
                        <div className="rank-progress-container">
                          <div 
                            className="rank-progress-bar" 
                            style={{ 
                              width: `${item.value}%`,
                              backgroundColor: idx === 0 ? '#10b981' : (idx < 3 ? '#6366f1' : '#f59e0b')
                            }}
                          />
                        </div>
                        <span className="rank-percentage">{item.value}%</span>
                        <span className="rank-trend">
                          {item.trend === 'up' ? (
                            <TrendingUp size={14} color="#10b981" />
                          ) : (
                            <TrendingDown size={14} color="#ef4444" />
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Warnings */}
                <div className="dashboard-card">
                  <div className="card-header">
                    <div>
                      <h2 className="card-title">Peringatan Terbaru</h2>
                      <p className="card-subtitle">Deteksi atensi kritis siswa</p>
                    </div>
                  </div>
                  <div className="warnings-list">
                    {warnings.slice(0, 3).map(w => (
                      <div className="warning-item" key={w.id}>
                        <div className="warning-content">
                          <div className="warning-student">{w.name}</div>
                          <div className="warning-desc">{w.desc}</div>
                        </div>
                        <div className="warning-time">
                          <Clock size={12} />
                          {w.time}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* VIEW 2: LIVE CAMERA FEED */}
        {activeTab === 'live' && (
          <div className="view-panel">
            <div className="live-container">
              
              {/* Camera Feed Canvas Screen */}
              <div className="live-feed-card">
                <div className="live-feed-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                    <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Live Camera Feed</span>
                  </div>
                  <span className="live-badge">🔴 Live</span>
                </div>
                
                <div className="live-feed-video-wrapper">
                  <img 
                    ref={imgRef}
                    src="/classroom_students.png" 
                    alt="Classroom Live Stream" 
                    className="classroom-img"
                  />
                  <canvas 
                    ref={canvasRef}
                    className="canvas-overlay"
                  />
                </div>
              </div>

              {/* Right Side Camera Detection List */}
              <div className="camera-result-card">
                <div className="card-header" style={{ marginBottom: '16px' }}>
                  <div>
                    <h2 className="card-title" style={{ fontSize: '1rem' }}>Classroom AI Detection Result</h2>
                    <p className="card-subtitle">Status atensi real-time terdeteksi kamera</p>
                  </div>
                </div>

                <div className="result-list">
                  {liveLog.map((result, idx) => (
                    <div className="result-item" key={idx}>
                      <span className="result-student-name">{result.name}</span>
                      <span className={`badge ${result.status === 'Attentive' ? 'badge-aktif' : 'badge-tidak-aktif'}`}>
                        {result.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* VIEW 3: STUDENT DATA VIEW */}
        {activeTab === 'students' && (
          <div className="view-panel">
            <div className="table-header-section">
              <h2 className="card-title" style={{ fontSize: '1.2rem' }}>Daftar Siswa dan Status Atensi Real-Time</h2>
              
              <div className="table-filter-bar">
                {/* Class Filter */}
                <select 
                  className="filter-select"
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                >
                  <option value="All">Semua Kelas</option>
                  {classroomFilterOptions.map((classroomName) => (
                    <option key={classroomName} value={classroomName}>
                      {classroomName}
                    </option>
                  ))}
                </select>

                {/* Status Filter */}
                <select 
                  className="filter-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="All">Semua Status</option>
                  <option value="Aktif">Aktif</option>
                  <option value="Tidak Aktif">Tidak Aktif</option>
                </select>
              </div>
            </div>

            <div className="student-table-card">
              <table className="student-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Nama</th>
                    <th>Kelas</th>
                    <th>Atensi</th>
                    <th>Emosi</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Tren</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((student, idx) => {
                      // Color based on attention percentage
                      let attColor = 'success';
                      if (student.attention < 50) attColor = 'danger';
                      else if (student.attention < 70) attColor = 'warning';

                      return (
                        <tr key={student.id}>
                          <td style={{ color: '#64748b', fontWeight: 600 }}>{idx + 1}</td>
                          <td className="table-student-name">{student.name}</td>
                          <td>{student.class}</td>
                          <td>
                            <div className="table-progress-bar">
                              <div className="table-bar-container">
                                <div 
                                  className={`table-bar ${attColor}`} 
                                  style={{ width: `${student.attention}%` }}
                                />
                              </div>
                              <span style={{ fontWeight: 600 }}>{student.attention}%</span>
                            </div>
                          </td>
                          <td>
                            <span className={`badge badge-${student.emotion.toLowerCase()}`}>
                              {student.emotion}
                            </span>
                          </td>
                          <td>
                            <span className={`badge badge-status ${student.status === 'Aktif' ? 'badge-aktif' : 'badge-tidak-aktif'}`}>
                              {student.status}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <span className="sparkline-icon">
                              {student.trend === 'up' ? (
                                <TrendingUp size={16} className="up" />
                              ) : (
                                <TrendingDown size={16} className="down" />
                              )}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                        Tidak ada siswa yang cocok dengan filter pencarian.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW 4: REPORTS VIEW */}
        {activeTab === 'reports' && (
          <div className="view-panel">
            
            {/* Header Cards (Alternative report summary cards) */}
            <div className="reports-header-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Calendar size={20} color="#6366f1" />
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Laporan Atensi Siswa</h3>
                  <p className="card-subtitle">Periode: 01 April — 05 April 2026</p>
                </div>
              </div>
              
              <button className="date-picker-trigger">
                <Calendar size={16} />
                <span>Ubah Periode</span>
              </button>
            </div>

            <section className="metrics-grid" style={{ marginBottom: '24px' }}>
              <div className="metric-card">
                <div className="metric-icon-wrapper total">
                  <BarChart3 size={22} />
                </div>
                <div className="metric-details">
                  <div className="metric-label">Rata-rata Atensi</div>
                  <div className="metric-value-container">
                    <div className="metric-value">81.4%</div>
                    <div className="metric-change up">+3.2%</div>
                  </div>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-icon-wrapper fokus">
                  <Award size={22} />
                </div>
                <div className="metric-details">
                  <div className="metric-label">Siswa Paling Fokus</div>
                  <div className="metric-value-container">
                    <div className="metric-value" style={{ fontSize: '1.2rem', padding: '6px 0' }}>Eka Putri</div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#10b981' }}>(95%)</span>
                  </div>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-icon-wrapper tidak-fokus">
                  <Users size={22} />
                </div>
                <div className="metric-details">
                  <div className="metric-label">Kelas Terbaik</div>
                  <div className="metric-value-container">
                    <div className="metric-value" style={{ fontSize: '1.4rem', padding: '3px 0' }}>X-A</div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#10b981' }}>(89%)</span>
                  </div>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-icon-wrapper peringatan">
                  <AlertCircle size={22} />
                </div>
                <div className="metric-details">
                  <div className="metric-label">Total Peringatan</div>
                  <div className="metric-value-container">
                    <div className="metric-value">12</div>
                    <div className="metric-change down">-4</div>
                  </div>
                </div>
              </div>
            </section>

            {/* Reports Charts Layout */}
            <div className="reports-grid-top">
              {/* Daily focus/unfocus trend lines */}
              <div className="dashboard-card">
                <div className="card-header">
                  <div>
                    <h2 className="card-title">Tren Atensi Harian</h2>
                    <p className="card-subtitle">Perbandingan persentase fokus vs tidak fokus historis</p>
                  </div>
                </div>
                <div style={{ height: '280px', position: 'relative' }}>
                  <Line data={reportsDailyTrendData} options={reportsDailyTrendOptions} />
                </div>
              </div>

              {/* Emotion donut */}
              <div className="dashboard-card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="card-header">
                  <div>
                    <h2 className="card-title">Distribusi Emosi</h2>
                    <p className="card-subtitle">Akumulasi emosi sepanjang periode</p>
                  </div>
                </div>
                <div style={{ height: '180px', position: 'relative', flex: 1 }}>
                  <Doughnut data={emotionDistributionData} options={emotionDonutOptions} />
                </div>
                
                <div className="custom-legend">
                  {emotionDistributionData.labels.map((label, idx) => (
                    <div key={label} className="legend-item">
                      <span 
                        className="legend-color" 
                        style={{ backgroundColor: emotionDistributionData.datasets[0].backgroundColor[idx] }}
                      />
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="reports-grid-bottom">
              {/* Class Comparison Bar Chart */}
              <div className="dashboard-card">
                <div className="card-header">
                  <div>
                    <h2 className="card-title">Perbandingan Atensi per Kelas</h2>
                    <p className="card-subtitle">Rata-rata tingkat fokus siswa antar kelas</p>
                  </div>
                </div>
                <div style={{ height: '280px', position: 'relative' }}>
                  <Bar data={reportsClassComparisonData} options={reportsClassComparisonOptions} />
                </div>
              </div>

              {/* Stacked Emotion Trend Bars */}
              <div className="dashboard-card">
                <div className="card-header">
                  <div>
                    <h2 className="card-title">Tren Emosi Harian</h2>
                    <p className="card-subtitle">Akumulasi sebaran emosi terdeteksi per hari</p>
                  </div>
                </div>
                <div style={{ height: '280px', position: 'relative' }}>
                  <Bar data={reportsEmotionTrendData} options={reportsEmotionTrendOptions} />
                </div>
              </div>
            </div>

          </div>
        )}

        {/* VIEW 5: PROFILE VIEW */}
        {activeTab === 'profile' && (
          <div className="view-panel">
            {showToast && (
              <div 
                style={{ 
                  position: 'fixed', 
                  top: '24px', 
                  right: '24px', 
                  background: '#10b981', 
                  color: 'white', 
                  padding: '16px 24px', 
                  borderRadius: '12px', 
                  fontWeight: 600, 
                  boxShadow: '0 10px 15px -3px rgba(16,185,129,0.3)', 
                  zIndex: 1000,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  animation: 'fadeIn 0.2s ease-out'
                }}
              >
                <CheckCircle size={18} />
                <span>Pengaturan berhasil disimpan!</span>
              </div>
            )}

            <div className="profile-grid">
              {/* Left Side: Avatar and Quick Stats */}
              <div className="profile-sidebar-card">
                <div className="profile-avatar-large">
                  <span>{profileData.avatarInitials}</span>
                </div>
                <h3 className="profile-name">{profileData.name}</h3>
                <span className="profile-role">Guru & Operator AI</span>
                
                <div className="profile-stats-mini">
                  <div className="mini-stat-box">
                    <div className="mini-stat-val">{totalStudentsCount}</div>
                    <div className="mini-stat-lbl">Total Siswa</div>
                  </div>
                  <div className="mini-stat-box">
                    <div className="mini-stat-val" style={{color: '#10b981'}}>Active</div>
                    <div className="mini-stat-lbl">Raspberry PI</div>
                  </div>
                </div>

                {/* Raspberry Pi Hardware connection panel */}
                <div className="pi-connection-card" style={{ width: '100%', marginTop: '32px' }}>
                  <div className="pi-info">
                    <div className="pi-icon-container">
                      <Cpu size={20} />
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b' }}>DEVICE IP</div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#1e1b4b' }}>{profileData.deviceIP}</div>
                    </div>
                  </div>
                  <div className="pi-conn-status">
                    <span className="pulse-dot" />
                    <span>ON</span>
                  </div>
                </div>
              </div>

              {/* Right Side: Form fields and Configuration */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                <div className="profile-details-card">
                  <h3 className="profile-section-title">
                    <Settings size={18} color="#6366f1" />
                    <span>Sinkronisasi Backend</span>
                  </h3>

                  <p className="card-subtitle" style={{ marginBottom: '16px' }}>
                    {backendMessage}
                  </p>

                  {!authToken ? (
                    <form onSubmit={handleLoginSubmit}>
                      <div className="profile-fields-grid">
                        <div className="profile-field-group">
                          <label>Email Login</label>
                          <input
                            type="email"
                            placeholder="guru@sekolah.id"
                            value={loginForm.email}
                            onChange={(event) => setLoginForm(previousForm => ({ ...previousForm, email: event.target.value }))}
                          />
                        </div>
                        <div className="profile-field-group">
                          <label>Password</label>
                          <input
                            type="password"
                            placeholder="Masukkan password"
                            value={loginForm.password}
                            onChange={(event) => setLoginForm(previousForm => ({ ...previousForm, password: event.target.value }))}
                          />
                        </div>
                      </div>

                      {loginError && (
                        <div style={{ color: '#ef4444', marginTop: '12px', fontWeight: 600 }}>
                          {loginError}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '12px', marginTop: '18px', flexWrap: 'wrap' }}>
                        <button type="submit" className="save-btn" disabled={syncState === 'loading'}>
                          {syncState === 'loading' ? 'Login...' : 'Login ke Backend'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div style={{ display: 'grid', gap: '8px' }}>
                        <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>User aktif</div>
                        <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1e1b4b' }}>{profileData.name}</div>
                        <div style={{ fontSize: '0.92rem', color: '#64748b' }}>{profileData.email || 'Email tidak tersedia'}</div>
                        <div style={{ fontSize: '0.92rem', color: '#64748b' }}>{backendTeachers.length} guru, {backendClassrooms.length} kelas tersinkron</div>
                      </div>

                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <button type="button" className="save-btn" onClick={handleLogout} style={{ background: '#ef4444' }}>
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* School Information */}
                <div className="profile-details-card">
                  <h3 className="profile-section-title">
                    <User size={18} color="#6366f1" />
                    <span>Informasi Akun Pengajar</span>
                  </h3>
                  
                  <form onSubmit={handleSaveProfile}>
                    <div className="profile-fields-grid">
                      <div className="profile-field-group">
                        <label>Nama Lengkap</label>
                        <input 
                          type="text" 
                          value={profileData.name}
                          onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                        />
                      </div>
                      <div className="profile-field-group">
                        <label>NIP / Nomor Identitas</label>
                        <input 
                          type="text" 
                          value={profileData.nip}
                          onChange={(e) => setProfileData({...profileData, nip: e.target.value})}
                        />
                      </div>
                      <div className="profile-field-group">
                        <label>Sekolah</label>
                        <input 
                          type="text" 
                          value={profileData.school}
                          onChange={(e) => setProfileData({...profileData, school: e.target.value})}
                        />
                      </div>
                      <div className="profile-field-group">
                        <label>Mata Pelajaran & Kelas</label>
                        <input 
                          type="text" 
                          value={profileData.subject}
                          onChange={(e) => setProfileData({...profileData, subject: e.target.value})}
                        />
                      </div>
                    </div>

                    <h3 className="profile-section-title" style={{ marginTop: '36px' }}>
                      <Cpu size={18} color="#6366f1" />
                      <span>Raspberry Pi & AI Model Config</span>
                    </h3>
                    
                    <div className="profile-fields-grid" style={{ marginBottom: '24px' }}>
                      <div className="profile-field-group">
                        <label>Perangkat Terkoneksi</label>
                        <input type="text" readOnly value={profileData.deviceName} style={{background: '#f8fafc', borderColor: '#e2e8f0', color: '#64748b'}} />
                      </div>
                      <div className="profile-field-group">
                        <label>Resolusi Kamera</label>
                        <input 
                          type="text" 
                          value={profileData.cameraRes}
                          onChange={(e) => setProfileData({...profileData, cameraRes: e.target.value})}
                        />
                      </div>
                      <div className="profile-field-group" style={{ gridColumn: 'span 2' }}>
                        <label>Model Deteksi Wajah & Emosi</label>
                        <input type="text" readOnly value={profileData.detectionModel} style={{background: '#f8fafc', borderColor: '#e2e8f0', color: '#64748b'}} />
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '24px 0', background: '#fafafc', padding: '16px 20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>Aturan Ambang Batas (Thresholds)</h4>
                      
                      {/* Sleep Threshold Slider */}
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                          <span>Akurasi Deteksi Mengantuk</span>
                          <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{profileData.sleepThreshold}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="30" 
                          max="90" 
                          value={profileData.sleepThreshold}
                          onChange={(e) => setProfileData({...profileData, sleepThreshold: parseInt(e.target.value)})}
                          style={{ width: '100%', accentColor: 'var(--primary)' }}
                        />
                      </div>

                      {/* Attention Loss Threshold Slider */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                          <span>Batas Durasi Tidak Fokus (Alarm)</span>
                          <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{profileData.unfocusThreshold} Menit</span>
                        </div>
                        <input 
                          type="range" 
                          min="3" 
                          max="30" 
                          value={profileData.unfocusThreshold}
                          onChange={(e) => setProfileData({...profileData, unfocusThreshold: parseInt(e.target.value)})}
                          style={{ width: '100%', accentColor: 'var(--primary)' }}
                        />
                      </div>
                    </div>

                    <h3 className="profile-section-title" style={{ marginTop: '36px' }}>
                      <Settings size={18} color="#6366f1" />
                      <span>Fungsi & Otomatisasi Sistem</span>
                    </h3>

                    <div style={{ marginBottom: '32px' }}>
                      {/* Auto Record Switch */}
                      <div className="switch-group">
                        <div className="switch-label-block">
                          <span className="switch-title">Simpan Rekaman Peringatan</span>
                          <span className="switch-desc">Merekam klip video 15 detik ke penyimpanan Raspberry Pi ketika siswa terdeteksi mengantuk/tidak fokus.</span>
                        </div>
                        <label className="toggle-switch">
                          <input 
                            type="checkbox" 
                            checked={profileData.autoRecord}
                            onChange={(e) => setProfileData({...profileData, autoRecord: e.target.checked})}
                          />
                          <span className="slider-round" />
                        </label>
                      </div>

                      {/* Push Notification Switch */}
                      <div className="switch-group">
                        <div className="switch-label-block">
                          <span className="switch-title">Push Notifikasi Real-time</span>
                          <span className="switch-desc">Mengirim alarm langsung ke perangkat mobile pengajar saat terjadi anomali atensi kelas.</span>
                        </div>
                        <label className="toggle-switch">
                          <input 
                            type="checkbox" 
                            checked={profileData.pushNotification}
                            onChange={(e) => setProfileData({...profileData, pushNotification: e.target.checked})}
                          />
                          <span className="slider-round" />
                        </label>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <button type="submit" className="btn-primary">
                        <Save size={18} />
                        <span>Simpan Pengaturan</span>
                      </button>
                    </div>

                  </form>
                </div>

              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
