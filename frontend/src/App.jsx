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
  setApiAuthToken,
} from './lib/backendApi';
import LoginPage from './components/LoginPage';

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

// Backend-driven empty states
const INITIAL_STUDENTS = [];
const INITIAL_WARNINGS = [];
const INITIAL_CAMERA_BOXES = [];

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
  const [liveLog, setLiveLog] = useState([]);
  const [connectionState, setConnectionState] = useState(WEB_SOCKET_URL ? 'connecting' : 'closed');
  
  // Profile settings state
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    role: "",
    nip: "",
    school: "",
    subject: "",
    deviceIP: "",
    deviceName: "",
    cameraRes: "",
    detectionModel: "",
    autoRecord: false,
    pushNotification: false,
    sleepThreshold: 0,
    unfocusThreshold: 0,
    photoFilepath: '',
    avatarInitials: ''
  });

  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    setApiAuthToken(authToken);
  }, [authToken]);

  // Dynamic fluctuation state for bounding boxes
  const [boxes, setBoxes] = useState(INITIAL_CAMERA_BOXES);

  // Live Camera Feed Canvas
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

      boxes.forEach(box => {
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

    if (imgRef.current && imgRef.current.complete) {
      drawCanvas();
    } else if (imgRef.current) {
      imgRef.current.onload = drawCanvas;
    }

    window.addEventListener('resize', drawCanvas);

    return () => {
      window.removeEventListener('resize', drawCanvas);
      if (imgRef.current) {
        imgRef.current.onload = null;
      }
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

        const remoteStudents = studentsResponse.items;
        const remoteClassrooms = classroomsResponse.items;
        const remoteTeachers = teachersResponse.items;

        const mergedStudents = mergeStudentsFromBackend(remoteStudents);
        const mergedBoxes = mergeBoxesFromStudents(mergedStudents);

        setStudents(mergedStudents);
        setBoxes(mergedBoxes);
        setLiveLog(mergedStudents.map((student) => ({
          name: student.name,
          status: student.status,
        })));
        setBackendClassrooms(remoteClassrooms);
        setBackendTeachers(remoteTeachers);
        setSyncState('connected');
        setBackendMessage(
          `Sinkron ${studentsResponse.meta.total} siswa, ${classroomsResponse.meta.total} kelas, dan ${teachersResponse.meta.total} guru.`
        );
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
    : [];
  const classStats = backendClassrooms.map((classroom) => ({
    name: classroom.name,
    value: students.filter((student) => student.class === classroom.name).length,
    trend: 'up',
  }));
  const averageAttention = students.length > 0
    ? (students.reduce((sum, student) => sum + Number(student.attention ?? 0), 0) / students.length).toFixed(1)
    : null;
  const topStudent = students.reduce((bestStudent, student) => {
    if (!bestStudent) {
      return student;
    }

    return Number(student.attention ?? 0) > Number(bestStudent.attention ?? 0) ? student : bestStudent;
  }, null);
  const bestClassroom = backendClassrooms.reduce((best, classroom) => {
    const studentCount = students.filter((student) => student.class === classroom.name).length;

    if (!best || studentCount > best.studentCount) {
      return { name: classroom.name, studentCount };
    }

    return best;
  }, null);

  const handleLoginSubmit = async (event) => {
    event.preventDefault();
    setLoginError('');
    setSyncState('loading');
    setBackendMessage('Login ke backend...');

    try {
      const response = await loginRequest(loginForm.email.trim(), loginForm.password);
      const sessionUser = response.data ?? null;
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
      setBackendMessage(`${response.message || 'Login berhasil'}. Menyinkronkan data backend...`);
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
    setStudents([]);
    setWarnings([]);
    setBoxes([]);
    setLiveLog([]);
  };

  // Save Config Handlers
  const handleSaveProfile = (e) => {
    e.preventDefault();
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Chart Data Configurations
  const emotionCategories = ['Senang', 'Netral', 'Bosan', 'Bingung', 'Mengantuk'];

  const dailyAttentionData = {
    labels: [],
    datasets: [
      {
        label: 'Data Backend',
        data: [],
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

  const emotionDistributionData = {
    labels: emotionCategories,
    datasets: [
      {
        data: emotionCategories.map((emotion) => students.filter((student) => student.emotion === emotion).length),
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

  const weeklyAttentionData = {
    labels: [],
    datasets: [
      {
        label: 'Fokus',
        data: [],
        backgroundColor: '#6366f1',
        borderRadius: 6,
        barThickness: 16,
      },
      {
        label: 'Tidak Fokus',
        data: [],
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

  const reportsDailyTrendData = {
    labels: [],
    datasets: [
      {
        label: 'Fokus %',
        data: [],
        borderColor: '#6366f1',
        backgroundColor: 'transparent',
        tension: 0.35,
        borderWidth: 3,
        pointBackgroundColor: '#6366f1',
      },
      {
        label: 'Tidak Fokus %',
        data: [],
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

  const reportsClassComparisonData = {
    labels: backendClassrooms.map((classroom) => classroom.name).filter(Boolean),
    datasets: [
      {
        label: 'Jumlah Siswa',
        data: backendClassrooms.map((classroom) => students.filter((student) => student.class === classroom.name).length),
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

  const reportsEmotionTrendData = {
    labels: [],
    datasets: [
      {
        label: 'Senang',
        data: [],
        backgroundColor: '#10b981',
        barThickness: 24,
      },
      {
        label: 'Netral',
        data: [],
        backgroundColor: '#6366f1',
        barThickness: 24,
      },
      {
        label: 'Bosan',
        data: [],
        backgroundColor: '#f59e0b',
        barThickness: 24,
      },
      {
        label: 'Bingung',
        data: [],
        backgroundColor: '#f43f5e',
        barThickness: 24,
      },
      {
        label: 'Mengantuk',
        data: [],
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

  if (!authToken) {
    return (
      <LoginPage
        loginForm={loginForm}
        setLoginForm={setLoginForm}
        onSubmit={handleLoginSubmit}
        error={loginError}
        statusMessage={backendMessage}
        isLoading={syncState === 'loading'}
      />
    );
  }

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <Award size={26} />
          <span className="logo-text">EduPose</span>
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
                  {connectionState === 'closed' && !WEB_SOCKET_URL && 'Belum terhubung'}
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
                    {classStats.length > 0 ? (
                      classStats.map((item, idx) => (
                        <div className="rank-item" key={item.name}>
                          <span className="rank-number">#{idx + 1}</span>
                          <span className="rank-name">{item.name}</span>
                          <div className="rank-progress-container">
                            <div 
                              className="rank-progress-bar" 
                              style={{ 
                                width: `${Math.min(100, item.value * 10)}%`,
                                backgroundColor: idx === 0 ? '#10b981' : (idx < 3 ? '#6366f1' : '#f59e0b')
                              }}
                            />
                          </div>
                          <span className="rank-percentage">{item.value}</span>
                          <span className="rank-trend">
                            <TrendingUp size={14} color="#10b981" />
                          </span>
                        </div>
                      ))
                    ) : (
                      <div style={{ color: '#64748b', fontSize: '0.92rem' }}>
                        Belum ada data kelas dari backend.
                      </div>
                    )}
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
                    {warnings.slice(0, 3).length > 0 ? (
                      warnings.slice(0, 3).map(w => (
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
                      ))
                    ) : (
                      <div style={{ color: '#64748b', fontSize: '0.92rem' }}>
                        Belum ada peringatan dari backend.
                      </div>
                    )}
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
                  {liveLog.length > 0 ? (
                    liveLog.map((result, idx) => (
                      <div className="result-item" key={idx}>
                        <span className="result-student-name">{result.name}</span>
                        <span className={`badge ${result.status === 'Attentive' ? 'badge-aktif' : 'badge-tidak-aktif'}`}>
                          {result.status}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div style={{ color: '#64748b', fontSize: '0.92rem' }}>
                      Belum ada data live dari backend.
                    </div>
                  )}
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
                    <div className="metric-value">{averageAttention ? `${averageAttention}%` : '—'}</div>
                    <div className="metric-change up">{averageAttention ? 'Data backend' : 'Belum ada data'}</div>
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
                    <div className="metric-value" style={{ fontSize: '1.2rem', padding: '6px 0' }}>{topStudent ? topStudent.name : 'Belum ada data'}</div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#10b981' }}>{topStudent ? `(${Number(topStudent.attention ?? 0)}%)` : '(0%)'}</span>
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
                    <div className="metric-value" style={{ fontSize: '1.4rem', padding: '3px 0' }}>{bestClassroom ? bestClassroom.name : 'Belum ada data'}</div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#10b981' }}>{bestClassroom ? `(${bestClassroom.studentCount} siswa)` : '(0 siswa)'}</span>
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
                    <div className="metric-value">{alertCount}</div>
                    <div className="metric-change down">Data backend</div>
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
