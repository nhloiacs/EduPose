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
  buildClassComparisonChart,
  buildDailyAttentionChart,
  buildReportsDailyTrendChart,
  buildTeacherProfile,
  buildWeeklyAttentionChart,
  checkBackendHealth,
  clearStoredSession,
  createTeacher,
  createStudent,
  createClassroom,
  deleteClassroom,
  deleteStudent,
  enrichStudentsWithPerformers,
  getAverageFocusFromMetrics,
  getDashboardMetrics,
  getDashboardSummary,
  getDashboardWarnings,
  getDateRange,
  getCurrentTeacherProfile,
  getClassroomOptions,
  getStudentDetail,
  getTopPerformers,
  listCollection,
  loginRequest,
  mapClassroomRankings,
  mapStudentWarnings,
  mapTopPerformersToStudents,
  mergeBoxesFromStudents,
  mergeStudentsFromBackend,
  persistSession,
  readStoredSession,
  setApiAuthToken,
  updateTeacher,
  updateStudent,
  updateClassroom,
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
  const [dashboardSummary, setDashboardSummary] = useState(null);
  const [dailyMetrics, setDailyMetrics] = useState([]);
  const [weeklyMetrics, setWeeklyMetrics] = useState([]);
  const [topClassroomRankings, setTopClassroomRankings] = useState([]);
  const [topStudentPerformers, setTopStudentPerformers] = useState([]);
  const [authToken, setAuthToken] = useState(storedSession.token);
  const [currentUser, setCurrentUser] = useState(storedSession.user);
  const [syncState, setSyncState] = useState(storedSession.token ? 'loading' : 'idle');
  const [backendMessage, setBackendMessage] = useState(storedSession.token ? 'Mencoba sinkronisasi data backend...' : 'Belum login ke backend');
  const [backendHealthState, setBackendHealthState] = useState('checking');
  const [backendHealthMessage, setBackendHealthMessage] = useState('Memeriksa backend...');
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
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

  const [profileError, setProfileError] = useState('');
  const [teacherForm, setTeacherForm] = useState({ name: '', email: '', role: 'teacher', password: '', nip: '', file: null });
  const [editingTeacherId, setEditingTeacherId] = useState(null);
  const [teacherFormMessage, setTeacherFormMessage] = useState('');
  const [teacherFormError, setTeacherFormError] = useState('');
  const [isTeacherSaving, setIsTeacherSaving] = useState(false);
  const [studentPage, setStudentPage] = useState(1);
  const [studentList, setStudentList] = useState([]);
  const [studentMeta, setStudentMeta] = useState({ total: 0, page: 1, size: 10 });
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentError, setStudentError] = useState('');
  const [studentDetail, setStudentDetail] = useState(null);
  const [studentForm, setStudentForm] = useState({ name: '', nis: '', classroom_id: '', file: null });
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [studentFormMessage, setStudentFormMessage] = useState('');
  const [classroomOptions, setClassroomOptions] = useState([]);
  const [classroomPage, setClassroomPage] = useState(1);
  const [classroomList, setClassroomList] = useState([]);
  const [classroomMeta, setClassroomMeta] = useState({ total: 0, page: 1, size: 10 });
  const [classroomLoading, setClassroomLoading] = useState(false);
  const [classroomError, setClassroomError] = useState('');
  const [classroomForm, setClassroomForm] = useState({ name: '' });
  const [editingClassroomId, setEditingClassroomId] = useState(null);

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
    // Profil formulir perlu diselaraskan saat sesi pengguna berubah.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProfileData(previousProfile => buildTeacherProfile(currentUser, previousProfile));
  }, [currentUser]);

  useEffect(() => {
    let isActive = true;

    const loadCurrentProfile = async () => {
      if (!authToken) return;

      try {
        const response = await getCurrentTeacherProfile(authToken);
        if (!isActive || !response.data) return;

        const profile = response.data;
        setCurrentUser((previousUser) => ({ ...previousUser, ...profile }));
        setProfileData((previousProfile) => ({
          ...buildTeacherProfile(profile, previousProfile),
          nip: profile.nip || '',
        }));
      } catch (error) {
        if (isActive) {
          setProfileError(error instanceof Error ? error.message : 'Profil tidak dapat dimuat dari backend.');
        }
      }
    };

    loadCurrentProfile();
    return () => { isActive = false; };
  }, [authToken]);

  useEffect(() => {
    if (!authToken || currentUser?.role !== 'principal') return;
    getClassroomOptions(authToken)
      .then((response) => setClassroomOptions(Array.isArray(response.data) ? response.data : []))
      .catch(() => setClassroomOptions([]));
  }, [authToken, currentUser?.role]);

  useEffect(() => {
    if (!authToken || currentUser?.role !== 'principal' || activeTab !== 'classrooms') return undefined;
    let isActive = true;
    const loadClassrooms = async () => {
      setClassroomLoading(true);
      setClassroomError('');
      try {
        const response = await listCollection('/classrooms', authToken, { page: classroomPage, size: 10 });
        if (isActive) { setClassroomList(response.items); setClassroomMeta(response.meta); }
      } catch (error) {
        if (isActive) setClassroomError(error instanceof Error ? error.message : 'Gagal mengambil daftar kelas.');
      } finally { if (isActive) setClassroomLoading(false); }
    };
    loadClassrooms();
    return () => { isActive = false; };
  }, [activeTab, authToken, classroomPage, currentUser?.role]);

  useEffect(() => {
    if (!authToken || currentUser?.role !== 'principal' || activeTab !== 'students') return undefined;
    let isActive = true;
    const timer = setTimeout(async () => {
      setStudentLoading(true);
      setStudentError('');
      try {
        const response = await listCollection('/students', authToken, { page: studentPage, size: 10, search: searchQuery.trim() });
        if (isActive) {
          setStudentList(mergeStudentsFromBackend(response.items));
          setStudentMeta(response.meta);
        }
      } catch (error) {
        if (isActive) setStudentError(error instanceof Error ? error.message : 'Gagal mengambil daftar siswa.');
      } finally {
        if (isActive) setStudentLoading(false);
      }
    }, 300);
    return () => { isActive = false; clearTimeout(timer); };
  }, [activeTab, authToken, currentUser?.role, searchQuery, studentPage]);

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

    const loadBackendData = async (showLoadingState = true) => {
      if (!authToken) {
        if (!isActive) {
          return;
        }

        setSyncState('idle');
        setBackendMessage('Belum login ke backend');
        return;
      }

      if (showLoadingState) {
        setSyncState('loading');
        setBackendMessage(
          dashboardSummary || students.length > 0
            ? 'Menyegarkan data dashboard...'
            : 'Mengambil statistik, chart, dan tabel dari backend...'
        );
      }

      const isPrincipal = currentUser?.role === 'principal';
      const dailyRange = getDateRange(7);
      const weeklyRange = getDateRange(28);

      const dashboardRequests = [
        getDashboardSummary(authToken),
        getDashboardMetrics(authToken, { granularity: 'daily', ...dailyRange }),
        getDashboardMetrics(authToken, { granularity: 'weekly', ...weeklyRange }),
        getTopPerformers(authToken, 'classroom', { limit: 10, sort_by: 'focus' }),
        // Backend membatasi limit top performer hingga 50 item.
        getTopPerformers(authToken, 'student', { limit: 50, sort_by: 'focus' }),
        getDashboardWarnings(authToken, 'student', { threshold: 60 }),
      ];

      const collectionRequests = isPrincipal
        ? [
            listCollection('/students', authToken, { page: 1, size: 100 }),
            listCollection('/classrooms', authToken, { page: 1, size: 100 }),
            listCollection('/teachers', authToken, { page: 1, size: 100 }),
          ]
        : [];

      try {
        const [
          summaryResult,
          dailyMetricsResult,
          weeklyMetricsResult,
          topClassroomsResult,
          topStudentsResult,
          warningsResult,
          ...collectionResults
        ] = await Promise.allSettled([...dashboardRequests, ...collectionRequests]);

        if (!isActive) {
          return;
        }

        const partialErrors = [];

        if (summaryResult.status === 'fulfilled') {
          setDashboardSummary(summaryResult.value.data ?? null);
        } else {
          partialErrors.push('statistik dashboard');
        }

        if (dailyMetricsResult.status === 'fulfilled') {
          setDailyMetrics(Array.isArray(dailyMetricsResult.value.data) ? dailyMetricsResult.value.data : []);
        } else {
          partialErrors.push('grafik harian');
        }

        if (weeklyMetricsResult.status === 'fulfilled') {
          setWeeklyMetrics(Array.isArray(weeklyMetricsResult.value.data) ? weeklyMetricsResult.value.data : []);
        } else {
          partialErrors.push('grafik mingguan');
        }

        if (topClassroomsResult.status === 'fulfilled') {
          setTopClassroomRankings(Array.isArray(topClassroomsResult.value.data) ? topClassroomsResult.value.data : []);
        } else {
          partialErrors.push('peringkat kelas');
        }

        let performers = [];
        if (topStudentsResult.status === 'fulfilled') {
          performers = Array.isArray(topStudentsResult.value.data) ? topStudentsResult.value.data : [];
          setTopStudentPerformers(performers);
        } else {
          partialErrors.push('data siswa');
        }

        if (warningsResult.status === 'fulfilled') {
          const warningItems = Array.isArray(warningsResult.value.data) ? warningsResult.value.data : [];
          setWarnings(mapStudentWarnings(warningItems));
        } else {
          partialErrors.push('peringatan');
        }

        let nextStudents = mapTopPerformersToStudents(performers);
        let remoteClassrooms = topClassroomRankings;
        let remoteTeachers = [];

        if (isPrincipal) {
          const [studentsResponseResult, classroomsResponseResult, teachersResponseResult] = collectionResults;

          if (studentsResponseResult?.status === 'fulfilled') {
            const remoteStudents = studentsResponseResult.value.items;
            nextStudents = enrichStudentsWithPerformers(
              mergeStudentsFromBackend(remoteStudents),
              performers,
            );
          } else if (studentsResponseResult?.status === 'rejected') {
            partialErrors.push('daftar siswa');
          }

          if (classroomsResponseResult?.status === 'fulfilled') {
            remoteClassrooms = classroomsResponseResult.value.items;
            setBackendClassrooms(remoteClassrooms);
          } else if (classroomsResponseResult?.status === 'rejected') {
            partialErrors.push('daftar kelas');
          }

          if (teachersResponseResult?.status === 'fulfilled') {
            remoteTeachers = teachersResponseResult.value.items;
            setBackendTeachers(remoteTeachers);
          } else if (teachersResponseResult?.status === 'rejected') {
            partialErrors.push('daftar guru');
          }
        } else {
          setBackendClassrooms(
            topClassroomsResult.status === 'fulfilled'
              ? (Array.isArray(topClassroomsResult.value.data) ? topClassroomsResult.value.data : [])
              : [],
          );
          setBackendTeachers([]);
        }

        const mergedBoxes = mergeBoxesFromStudents(nextStudents);

        setStudents(nextStudents);
        setBoxes(mergedBoxes);
        setLiveLog(nextStudents.map((student) => ({
          name: student.name,
          status: student.status,
        })));
        setLastSyncedAt(new Date());

        if (summaryResult.status === 'rejected') {
          throw summaryResult.reason;
        }

        const summaryData = summaryResult.value.data ?? {};
        const totalStudents = summaryData.total_students ?? nextStudents.length;
        const totalClassrooms = summaryData.total_classrooms ?? remoteClassrooms.length;
        const totalTeachers = summaryData.total_teachers ?? remoteTeachers.length;

        setSyncState('connected');
        setBackendMessage(
          partialErrors.length > 0
            ? `Dashboard dimuat sebagian. Gagal mengambil: ${partialErrors.join(', ')}.`
            : `Sinkron dashboard: ${totalStudents} siswa, ${totalClassrooms} kelas${isPrincipal ? `, ${totalTeachers} guru` : ''}.`
        );
      } catch (error) {
        if (!isActive) {
          return;
        }

        setSyncState('error');
        setBackendMessage(error instanceof Error ? error.message : 'Gagal sinkron ke backend');
      }
    };

    loadBackendData(true);

    const refreshIntervalId = setInterval(() => {
      loadBackendData(false);
    }, 30000);

    return () => {
      isActive = false;
      clearInterval(refreshIntervalId);
    };
  }, [authToken, currentUser?.role]);

  // Derived Metrics
  const teacherMetrics = dashboardSummary?.metrics_summary ?? null;
  const totalStudentsCount = dashboardSummary?.total_students ?? students.length;
  const focusedCount = topStudentPerformers.filter(
    (student) => Number(student.avg_focus_percentage ?? student.attention ?? 0) >= 70,
  ).length;
  const unfocusedCount = topStudentPerformers.filter(
    (student) => Number(student.avg_focus_percentage ?? student.attention ?? 0) < 70,
  ).length;
  const alertCount = warnings.length;
  const classroomFilterOptions = backendClassrooms.length > 0
    ? backendClassrooms.map((classroom) => classroom.name).filter(Boolean)
    : [];
  const classStats = mapClassroomRankings(topClassroomRankings);
  const averageAttention = teacherMetrics?.avg_focus_percentage
    ?? getAverageFocusFromMetrics(dailyMetrics)
    ?? (students.length > 0
      ? (students.reduce((sum, student) => sum + Number(student.attention ?? 0), 0) / students.length).toFixed(1)
      : null);
  const topStudentPerformer = topStudentPerformers[0] ?? null;
  const topStudent = topStudentPerformer
    ? {
        name: topStudentPerformer.name,
        attention: Number(topStudentPerformer.avg_focus_percentage ?? 0),
      }
    : students.reduce((bestStudent, student) => {
        if (!bestStudent) {
          return student;
        }

        return Number(student.attention ?? 0) > Number(bestStudent.attention ?? 0) ? student : bestStudent;
      }, null);
  const bestClassroom = classStats[0]
    ? {
        name: classStats[0].name,
        studentCount: classStats[0].value,
      }
    : null;

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
    setDashboardSummary(null);
    setDailyMetrics([]);
    setWeeklyMetrics([]);
    setTopClassroomRankings([]);
    setTopStudentPerformers([]);
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
    setProfileError('Pembaruan profil belum dapat dikirim: endpoint backend hanya mengizinkan PATCH /teachers/{teacher_id} untuk role principal, sedangkan profil saat ini tidak menyediakan endpoint update mandiri.');
  };

  const resetTeacherForm = () => {
    setTeacherForm({ name: '', email: '', role: 'teacher', password: '', nip: '', file: null });
    setEditingTeacherId(null);
  };

  const handleTeacherSubmit = async (event) => {
    event.preventDefault();
    setTeacherFormError('');
    setTeacherFormMessage('');

    if (!editingTeacherId && !teacherForm.file) {
      setTeacherFormError('Foto profil wajib diisi saat membuat teacher.');
      return;
    }

    setIsTeacherSaving(true);
    try {
      const response = editingTeacherId
        ? await updateTeacher(editingTeacherId, teacherForm, authToken)
        : await createTeacher(teacherForm, authToken);
      const savedTeacher = response.data;
      setBackendTeachers((previousTeachers) => editingTeacherId
        ? previousTeachers.map((teacher) => String(teacher.id) === String(editingTeacherId) ? { ...teacher, ...savedTeacher } : teacher)
        : [savedTeacher, ...previousTeachers]);
      setTeacherFormMessage(response.message || 'Data teacher berhasil disimpan.');
      resetTeacherForm();
    } catch (error) {
      setTeacherFormError(error instanceof Error ? error.message : 'Gagal menyimpan data teacher.');
    } finally {
      setIsTeacherSaving(false);
    }
  };

  const startEditTeacher = (teacher) => {
    setEditingTeacherId(teacher.id);
    setTeacherForm({ name: teacher.name || '', email: teacher.email || '', role: teacher.role || 'teacher', password: '', nip: teacher.nip || '', file: null });
    setTeacherFormError('');
    setTeacherFormMessage('');
  };

  const resetStudentForm = () => {
    setStudentForm({ name: '', nis: '', classroom_id: '', file: null });
    setEditingStudentId(null);
  };

  const handleStudentSubmit = async (event) => {
    event.preventDefault();
    setStudentError('');
    setStudentFormMessage('');
    if (!editingStudentId && !studentForm.file) {
      setStudentError('Foto profil wajib diisi saat membuat siswa.');
      return;
    }
    try {
      const response = editingStudentId
        ? await updateStudent(editingStudentId, studentForm, authToken)
        : await createStudent(studentForm, authToken);
      setStudentFormMessage(response.message || 'Data siswa berhasil disimpan.');
      resetStudentForm();
      setStudentPage(1);
      const listResponse = await listCollection('/students', authToken, { page: 1, size: 10, search: searchQuery.trim() });
      setStudentList(mergeStudentsFromBackend(listResponse.items));
      setStudentMeta(listResponse.meta);
    } catch (error) {
      setStudentError(error instanceof Error ? error.message : 'Gagal menyimpan data siswa.');
    }
  };

  const startEditStudent = (student) => {
    setEditingStudentId(student.id);
    setStudentForm({ name: student.name || '', nis: student.nis || '', classroom_id: student.classroom_id || '', file: null });
    setStudentDetail(null);
    setStudentError('');
    setStudentFormMessage('');
  };

  const handleStudentDetail = async (studentId) => {
    setStudentError('');
    try {
      const response = await getStudentDetail(studentId, authToken);
      setStudentDetail(response.data);
    } catch (error) {
      setStudentError(error instanceof Error ? error.message : 'Gagal mengambil detail siswa.');
    }
  };

  const handleDeleteStudent = async (student) => {
    if (!window.confirm(`Hapus siswa ${student.name}?`)) return;
    setStudentError('');
    try {
      await deleteStudent(student.id, authToken);
      setStudentList((previous) => previous.filter((item) => String(item.id) !== String(student.id)));
      setStudentMeta((previous) => ({ ...previous, total: Math.max(0, previous.total - 1) }));
      if (String(studentDetail?.id) === String(student.id)) setStudentDetail(null);
    } catch (error) {
      setStudentError(error instanceof Error ? error.message : 'Gagal menghapus siswa.');
    }
  };

  const reloadClassroomOptions = async () => {
    const response = await getClassroomOptions(authToken);
    const options = Array.isArray(response.data) ? response.data : [];
    setClassroomOptions(options);
    setBackendClassrooms(options);
  };

  const resetClassroomForm = () => {
    setClassroomForm({ name: '' });
    setEditingClassroomId(null);
  };

  const handleClassroomSubmit = async (event) => {
    event.preventDefault();
    setClassroomError('');
    try {
      const response = editingClassroomId
        ? await updateClassroom(editingClassroomId, classroomForm, authToken)
        : await createClassroom(classroomForm, authToken);
      const saved = response.data;
      setClassroomList((previous) => editingClassroomId
        ? previous.map((item) => String(item.id) === String(editingClassroomId) ? saved : item)
        : [saved, ...previous]);
      if (editingClassroomId) {
        setStudentList((previous) => previous.map((student) => String(student.classroom_id) === String(editingClassroomId)
          ? { ...student, class: saved.name }
          : student));
      }
      setClassroomMeta((previous) => ({ ...previous, total: editingClassroomId ? previous.total : previous.total + 1 }));
      resetClassroomForm();
      await reloadClassroomOptions();
    } catch (error) {
      setClassroomError(error instanceof Error ? error.message : 'Gagal menyimpan kelas.');
    }
  };

  const handleDeleteClassroom = async (classroom) => {
    if (!window.confirm(`Hapus kelas ${classroom.name}?`)) return;
    setClassroomError('');
    try {
      await deleteClassroom(classroom.id, authToken);
      setClassroomList((previous) => previous.filter((item) => String(item.id) !== String(classroom.id)));
      setClassroomMeta((previous) => ({ ...previous, total: Math.max(0, previous.total - 1) }));
      if (studentForm.classroom_id === classroom.id) setStudentForm((previous) => ({ ...previous, classroom_id: '' }));
      await reloadClassroomOptions();
    } catch (error) {
      setClassroomError(error instanceof Error ? error.message : 'Gagal menghapus kelas. Pastikan kelas tidak masih digunakan siswa.');
    }
  };

  // Chart Data Configurations
  const emotionCategories = ['Senang', 'Netral', 'Bosan', 'Bingung', 'Mengantuk'];

  const dailyAttentionData = buildDailyAttentionChart(dailyMetrics);

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

  const weeklyAttentionData = buildWeeklyAttentionChart(weeklyMetrics);

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

  const reportsDailyTrendData = buildReportsDailyTrendChart(dailyMetrics);

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

  const reportsClassComparisonData = buildClassComparisonChart(topClassroomRankings);

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

  const hasDailyMetrics = dailyMetrics.length > 0;
  const hasWeeklyMetrics = weeklyMetrics.length > 0;
  const hasWarnings = warnings.length > 0;
  const hasEmotionChartData = emotionDistributionData.datasets[0].data.some((value) => value > 0);
  const hasClassChartData = reportsClassComparisonData.labels.length > 0
    && reportsClassComparisonData.datasets[0].data.some((value) => value > 0);
  const isInitialLoading = syncState === 'loading' && !dashboardSummary && students.length === 0;
  const isRefreshing = syncState === 'loading' && (dashboardSummary || students.length > 0);
  const dashboardErrorMessage = syncState === 'error' ? backendMessage : '';

  // Student list search/filter logic
  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          student.class.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = classFilter === 'All' ? true : student.class === classFilter;
    const matchesStatus = statusFilter === 'All' ? true : student.status === statusFilter;
    return matchesSearch && matchesClass && matchesStatus;
  });
  const displayedStudents = (currentUser?.role === 'principal' ? studentList : filteredStudents).filter((student) => {
    const matchesClass = classFilter === 'All' || student.class === classFilter;
    const matchesStatus = statusFilter === 'All' || student.status === statusFilter;
    return matchesClass && matchesStatus;
  });
  const studentTotalPages = Math.max(1, Math.ceil(studentMeta.total / studentMeta.size));
  const isLegacyEmbeddedFormVisible = activeTab === 'legacy-embedded-form';

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

          {currentUser?.role === 'principal' && <button
            className={`menu-item ${activeTab === 'classrooms' ? 'active' : ''}`}
            onClick={() => setActiveTab('classrooms')}
          >
            <Users size={20} />
            <span className="menu-label">Classroom</span>
          </button>}

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

          {currentUser?.role === 'principal' && <button
            className={`menu-item ${activeTab === 'teachers' ? 'active' : ''}`}
            onClick={() => setActiveTab('teachers')}
          >
            <User size={20} />
            <span className="menu-label">Teacher</span>
          </button>}
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
              {activeTab === 'classrooms' && 'Data Classroom'}
              {activeTab === 'reports' && 'Laporan Atensi & Emosi'}
              {activeTab === 'profile' && 'Profil & Pengaturan Sistem'}
              {activeTab === 'teachers' && 'Manajemen Teacher'}
            </h1>
            <p>
              {activeTab === 'dashboard' && 'Selamat datang! Berikut ringkasan data atensi siswa hari ini.'}
              {activeTab === 'live' && 'Pemantauan kelas real-time dengan model deteksi AI Raspberry Pi.'}
              {activeTab === 'students' && 'Daftar siswa beserta metrik atensi dan emosi real-time.'}
              {activeTab === 'classrooms' && 'Kelola kelas dan sinkronisasi pilihan kelas untuk siswa.'}
              {activeTab === 'reports' && 'Analisis tren atensi dan distribusi emosi siswa secara historis.'}
              {activeTab === 'profile' && 'Profil teacher tersinkron dengan backend serta pengaturan sistem.'}
              {activeTab === 'teachers' && 'Tambah dan ubah data teacher.'}
            </p>
          </div>

          <div className="header-actions">
            <div className="search-bar">
              <Search size={18} color="#64748b" />
              <input 
                type="text" 
                placeholder="Search Student/Class/Attention..." 
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setStudentPage(1);
                }}
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

        {(isInitialLoading || isRefreshing || dashboardErrorMessage || lastSyncedAt) && (
          <section
            style={{
              margin: '0 0 20px',
              padding: '14px 18px',
              borderRadius: '16px',
              background: dashboardErrorMessage
                ? 'rgba(239, 68, 68, 0.08)'
                : isInitialLoading
                  ? 'rgba(99, 102, 241, 0.08)'
                  : 'rgba(16, 185, 129, 0.08)',
              border: `1px solid ${dashboardErrorMessage ? 'rgba(239, 68, 68, 0.18)' : 'rgba(99, 102, 241, 0.12)'}`,
              display: 'flex',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontWeight: 700, color: '#1e1b4b', marginBottom: '4px' }}>
                {dashboardErrorMessage
                  ? 'Sinkronisasi gagal'
                  : isInitialLoading
                    ? 'Memuat data dashboard'
                    : isRefreshing
                      ? 'Menyegarkan data dashboard'
                      : 'Data dashboard siap'}
              </div>
              <div style={{ color: '#64748b', fontSize: '0.92rem' }}>
                {dashboardErrorMessage
                  ? dashboardErrorMessage
                  : isInitialLoading
                    ? 'Sedang mengambil data backend untuk statistik, chart, dan tabel.'
                    : isRefreshing
                      ? 'Refresh otomatis berjalan tanpa mengganggu data yang sedang tampil.'
                      : `Terakhir sinkron ${lastSyncedAt?.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`}
              </div>
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>
              Auto refresh 30 detik
            </div>
          </section>
        )}

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
                  <div className="metric-change up">{dashboardSummary ? 'Data backend' : 'Belum ada data'}</div>
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
                  <div className="metric-change up">{averageAttention ? `${averageAttention}% rata-rata` : 'Belum ada data'}</div>
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
                  <div className="metric-change down">{teacherMetrics ? `${teacherMetrics.total_using_phone} HP` : 'Data backend'}</div>
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
                  <div className="metric-change up">{hasWarnings ? 'Perlu perhatian' : 'Aman'}</div>
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
                <div style={{ height: '280px', position: 'relative', display: 'grid', placeItems: 'center' }}>
                  {isInitialLoading ? (
                    <div style={{ color: '#64748b', fontSize: '0.92rem' }}>Memuat grafik dari backend...</div>
                  ) : hasDailyMetrics ? (
                    <Line data={dailyAttentionData} options={dailyAttentionOptions} />
                  ) : (
                    <div style={{ color: '#64748b', fontSize: '0.92rem', textAlign: 'center' }}>
                      Belum ada data harian dari backend untuk grafik ini.
                    </div>
                  )}
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
                <div style={{ height: '180px', position: 'relative', flex: 1, display: 'grid', placeItems: 'center' }}>
                  {hasEmotionChartData ? (
                    <Doughnut data={emotionDistributionData} options={emotionDonutOptions} />
                  ) : (
                    <div style={{ color: '#64748b', fontSize: '0.92rem', textAlign: 'center' }}>
                      Belum ada data emosi dari backend.
                    </div>
                  )}
                </div>
                
                {/* Custom Styled Legends */}
                {hasEmotionChartData ? (
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
                ) : null}
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
                <div style={{ height: '280px', position: 'relative', display: 'grid', placeItems: 'center' }}>
                  {isInitialLoading ? (
                    <div style={{ color: '#64748b', fontSize: '0.92rem' }}>Memuat grafik mingguan...</div>
                  ) : hasWeeklyMetrics ? (
                    <Bar data={weeklyAttentionData} options={weeklyAttentionOptions} />
                  ) : (
                    <div style={{ color: '#64748b', fontSize: '0.92rem', textAlign: 'center' }}>
                      Belum ada data mingguan dari backend.
                    </div>
                  )}
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
                                width: `${Math.min(100, item.value)}%`,
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

            {studentError && (
              <p role="alert" style={{ color: '#b91c1c', marginBottom: '12px' }}>{studentError}</p>
            )}

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
                    {currentUser?.role === 'principal' && <th>Aksi</th>}
                  </tr>
                </thead>
                <tbody>
                  {studentLoading || (isInitialLoading && currentUser?.role !== 'principal') ? (
                    <tr>
                      <td colSpan={currentUser?.role === 'principal' ? 8 : 7} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                        Memuat data siswa dari backend...
                      </td>
                    </tr>
                  ) : displayedStudents.length > 0 ? (
                    displayedStudents.map((student, idx) => {
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
                          {currentUser?.role === 'principal' && (
                            <td>
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                <button type="button" className="save-btn" onClick={() => handleStudentDetail(student.id)}>Detail</button>
                                <button type="button" className="save-btn" onClick={() => startEditStudent(student)}>Ubah</button>
                                <button type="button" className="save-btn" style={{ background: '#ef4444' }} onClick={() => handleDeleteStudent(student)}>Hapus</button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={currentUser?.role === 'principal' ? 8 : 7} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                        {searchQuery || classFilter !== 'All' || statusFilter !== 'All'
                          ? 'Tidak ada siswa yang cocok dengan filter pencarian.'
                          : 'Belum ada data siswa dari backend.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'classrooms' && currentUser?.role === 'principal' && (
          <div className="view-panel">
            <div className="table-header-section">
              <h2 className="card-title" style={{ fontSize: '1.2rem' }}>Daftar Classroom</h2>
              <span style={{ color: '#64748b' }}>{classroomMeta.total} kelas tersinkron</span>
            </div>
            {classroomError && <p role="alert" style={{ color: '#b91c1c' }}>{classroomError}</p>}
            <div className="student-table-card">
              <table className="student-table">
                <thead><tr><th>#</th><th>Nama Kelas</th><th style={{ textAlign: 'right' }}>Aksi</th></tr></thead>
                <tbody>
                  {classroomLoading ? <tr><td colSpan="3" style={{ textAlign: 'center', padding: '32px' }}>Memuat classroom...</td></tr>
                    : classroomList.length ? classroomList.map((classroom, index) => <tr key={classroom.id}><td>{(classroomMeta.page - 1) * classroomMeta.size + index + 1}</td><td>{classroom.name}</td><td style={{ textAlign: 'right' }}><button type="button" className="save-btn" onClick={() => { setEditingClassroomId(classroom.id); setClassroomForm({ name: classroom.name }); }}>Ubah</button> <button type="button" className="save-btn" style={{ background: '#ef4444' }} onClick={() => handleDeleteClassroom(classroom)}>Hapus</button></td></tr>)
                    : <tr><td colSpan="3" style={{ textAlign: 'center', padding: '32px' }}>Belum ada classroom.</td></tr>}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '18px 0' }}>
              <button type="button" className="save-btn" disabled={classroomPage <= 1} onClick={() => setClassroomPage((page) => page - 1)}>Sebelumnya</button>
              <span>Halaman {classroomMeta.page} dari {Math.max(1, Math.ceil(classroomMeta.total / classroomMeta.size))}</span>
              <button type="button" className="save-btn" disabled={classroomPage >= Math.max(1, Math.ceil(classroomMeta.total / classroomMeta.size))} onClick={() => setClassroomPage((page) => page + 1)}>Berikutnya</button>
            </div>
            <div className="profile-details-card">
              <h3 className="profile-section-title"><Users size={18} color="#6366f1" /><span>{editingClassroomId ? 'Ubah Classroom' : 'Tambah Classroom'}</span></h3>
              <form onSubmit={handleClassroomSubmit}>
                <div className="profile-field-group"><label>Nama Kelas</label><input required value={classroomForm.name} onChange={(e) => setClassroomForm({ name: e.target.value })} /></div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}><button type="submit" className="btn-primary">{editingClassroomId ? 'Simpan Perubahan' : 'Buat Classroom'}</button>{editingClassroomId && <button type="button" className="save-btn" onClick={resetClassroomForm}>Batal</button>}</div>
              </form>
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
                <div style={{ height: '280px', position: 'relative', display: 'grid', placeItems: 'center' }}>
                  {hasDailyMetrics ? (
                    <Line data={reportsDailyTrendData} options={reportsDailyTrendOptions} />
                  ) : (
                    <div style={{ color: '#64748b', fontSize: '0.92rem', textAlign: 'center' }}>
                      Belum ada data tren harian dari backend.
                    </div>
                  )}
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
                <div style={{ height: '180px', position: 'relative', flex: 1, display: 'grid', placeItems: 'center' }}>
                  {hasEmotionChartData ? (
                    <Doughnut data={emotionDistributionData} options={emotionDonutOptions} />
                  ) : (
                    <div style={{ color: '#64748b', fontSize: '0.92rem', textAlign: 'center' }}>
                      Belum ada data emosi dari backend.
                    </div>
                  )}
                </div>
                
                {hasEmotionChartData ? (
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
                ) : null}
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
                <div style={{ height: '280px', position: 'relative', display: 'grid', placeItems: 'center' }}>
                  {hasClassChartData ? (
                    <Bar data={reportsClassComparisonData} options={reportsClassComparisonOptions} />
                  ) : (
                    <div style={{ color: '#64748b', fontSize: '0.92rem', textAlign: 'center' }}>
                      Belum ada data kelas dari backend.
                    </div>
                  )}
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
                <div style={{ height: '280px', position: 'relative', display: 'grid', placeItems: 'center' }}>
                  <div style={{ color: '#64748b', fontSize: '0.92rem', textAlign: 'center' }}>
                    Belum ada data emosi historis dari backend.
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* VIEW 5: PROFILE VIEW */}
        {activeTab === 'profile' && (
          <div className="view-panel">
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
                  {profileError && (
                    <p role="alert" style={{ color: '#b91c1c', margin: '0 0 16px' }}>{profileError}</p>
                  )}

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

              {isLegacyEmbeddedFormVisible && currentUser?.role === 'principal' && (
                <div className="profile-details-card">
                  <h3 className="profile-section-title">
                    <User size={18} color="#6366f1" />
                    <span>{editingTeacherId ? 'Ubah Teacher' : 'Tambah Teacher'}</span>
                  </h3>
                  <p className="card-subtitle">Data dikirim ke backend sebagai multipart/form-data.</p>
                  {teacherFormError && <p role="alert" style={{ color: '#b91c1c' }}>{teacherFormError}</p>}
                  {teacherFormMessage && <p style={{ color: '#047857' }}>{teacherFormMessage}</p>}
                  <form onSubmit={handleTeacherSubmit}>
                    <div className="profile-fields-grid">
                      <div className="profile-field-group"><label>Nama</label><input required value={teacherForm.name} onChange={(e) => setTeacherForm({ ...teacherForm, name: e.target.value })} /></div>
                      <div className="profile-field-group"><label>Email</label><input required type="email" value={teacherForm.email} onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })} /></div>
                      <div className="profile-field-group"><label>NIP</label><input required value={teacherForm.nip} onChange={(e) => setTeacherForm({ ...teacherForm, nip: e.target.value })} /></div>
                      <div className="profile-field-group"><label>Role</label><input required value={teacherForm.role} onChange={(e) => setTeacherForm({ ...teacherForm, role: e.target.value })} /></div>
                      {!editingTeacherId && <div className="profile-field-group"><label>Password</label><input required minLength="1" type="password" value={teacherForm.password} onChange={(e) => setTeacherForm({ ...teacherForm, password: e.target.value })} /></div>}
                      <div className="profile-field-group"><label>Foto {editingTeacherId ? '(opsional)' : ''}</label><input required={!editingTeacherId} type="file" accept="image/*" onChange={(e) => setTeacherForm({ ...teacherForm, file: e.target.files?.[0] || null })} /></div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                      <button disabled={isTeacherSaving} type="submit" className="btn-primary">{isTeacherSaving ? 'Menyimpan...' : editingTeacherId ? 'Simpan Perubahan' : 'Buat Teacher'}</button>
                      {editingTeacherId && <button type="button" className="save-btn" onClick={resetTeacherForm}>Batal</button>}
                    </div>
                  </form>

                  <div style={{ marginTop: '28px', display: 'grid', gap: '10px' }}>
                    {backendTeachers.map((teacher) => (
                      <div key={teacher.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                        <span>{teacher.name} — {teacher.nip}</span>
                        <button type="button" className="save-btn" onClick={() => startEditTeacher(teacher)}>Ubah</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {isLegacyEmbeddedFormVisible && currentUser?.role === 'principal' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', margin: '18px 0' }}>
                  <span style={{ color: '#64748b' }}>Halaman {studentMeta.page} dari {studentTotalPages} — {studentMeta.total} siswa</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" className="save-btn" disabled={studentPage <= 1} onClick={() => setStudentPage((page) => page - 1)}>Sebelumnya</button>
                    <button type="button" className="save-btn" disabled={studentPage >= studentTotalPages} onClick={() => setStudentPage((page) => page + 1)}>Berikutnya</button>
                  </div>
                </div>

                {studentError && <p role="alert" style={{ color: '#b91c1c' }}>{studentError}</p>}
                {studentDetail && (
                  <div className="profile-details-card" style={{ marginBottom: '20px' }}>
                    <h3 className="profile-section-title"><User size={18} color="#6366f1" /><span>Detail Siswa</span></h3>
                    <p><strong>{studentDetail.name}</strong> — NIS: {studentDetail.nis || '-'} — Kelas: {studentDetail.classroom_name || '-'}</p>
                    <p>Rata-rata fokus: {studentDetail.metrics_summary?.avg_focus_score ?? 0} | Terdistraksi: {studentDetail.metrics_summary?.avg_distracted_score ?? 0} | Total angkat tangan: {studentDetail.metrics_summary?.total_raised_hand_count ?? 0}</p>
                  </div>
                )}

                <div className="profile-details-card">
                  <h3 className="profile-section-title"><User size={18} color="#6366f1" /><span>{editingStudentId ? 'Ubah Siswa' : 'Tambah Siswa'}</span></h3>
                  {studentFormMessage && <p style={{ color: '#047857' }}>{studentFormMessage}</p>}
                  <form onSubmit={handleStudentSubmit}>
                    <div className="profile-fields-grid">
                      <div className="profile-field-group"><label>Nama</label><input required value={studentForm.name} onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })} /></div>
                      <div className="profile-field-group"><label>NIS</label><input required value={studentForm.nis} onChange={(e) => setStudentForm({ ...studentForm, nis: e.target.value })} /></div>
                      <div className="profile-field-group"><label>Kelas</label><select required value={studentForm.classroom_id} onChange={(e) => setStudentForm({ ...studentForm, classroom_id: e.target.value })}><option value="">Pilih kelas</option>{classroomOptions.map((classroom) => <option key={classroom.id} value={classroom.id}>{classroom.name}</option>)}</select></div>
                      <div className="profile-field-group"><label>Foto {editingStudentId ? '(opsional)' : ''}</label><input required={!editingStudentId} type="file" accept="image/*" onChange={(e) => setStudentForm({ ...studentForm, file: e.target.files?.[0] || null })} /></div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}><button type="submit" className="btn-primary">{editingStudentId ? 'Simpan Perubahan' : 'Buat Siswa'}</button>{editingStudentId && <button type="button" className="save-btn" onClick={resetStudentForm}>Batal</button>}</div>
                  </form>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'teachers' && currentUser?.role === 'principal' && (
          <div className="view-panel">
            <div className="profile-details-card">
              <h3 className="profile-section-title"><User size={18} color="#6366f1" /><span>{editingTeacherId ? 'Ubah Teacher' : 'Tambah Teacher'}</span></h3>
              <p className="card-subtitle">Data dikirim ke backend sebagai multipart/form-data.</p>
              {teacherFormError && <p role="alert" style={{ color: '#b91c1c' }}>{teacherFormError}</p>}
              {teacherFormMessage && <p style={{ color: '#047857' }}>{teacherFormMessage}</p>}
              <form onSubmit={handleTeacherSubmit}><div className="profile-fields-grid">
                <div className="profile-field-group"><label>Nama</label><input required value={teacherForm.name} onChange={(e) => setTeacherForm({ ...teacherForm, name: e.target.value })} /></div>
                <div className="profile-field-group"><label>Email</label><input required type="email" value={teacherForm.email} onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })} /></div>
                <div className="profile-field-group"><label>NIP</label><input required value={teacherForm.nip} onChange={(e) => setTeacherForm({ ...teacherForm, nip: e.target.value })} /></div>
                <div className="profile-field-group"><label>Role</label><input required value={teacherForm.role} onChange={(e) => setTeacherForm({ ...teacherForm, role: e.target.value })} /></div>
                {!editingTeacherId && <div className="profile-field-group"><label>Password</label><input required type="password" value={teacherForm.password} onChange={(e) => setTeacherForm({ ...teacherForm, password: e.target.value })} /></div>}
                <div className="profile-field-group"><label>Foto {editingTeacherId ? '(opsional)' : ''}</label><input required={!editingTeacherId} type="file" accept="image/*" onChange={(e) => setTeacherForm({ ...teacherForm, file: e.target.files?.[0] || null })} /></div>
              </div><div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}><button disabled={isTeacherSaving} type="submit" className="btn-primary">{isTeacherSaving ? 'Menyimpan...' : editingTeacherId ? 'Simpan Perubahan' : 'Buat Teacher'}</button>{editingTeacherId && <button type="button" className="save-btn" onClick={resetTeacherForm}>Batal</button>}</div></form>
            </div>
            <div className="student-table-card" style={{ marginTop: '20px' }}>{backendTeachers.map((teacher) => <div key={teacher.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid #e2e8f0' }}><span>{teacher.name} — {teacher.nip}</span><button type="button" className="save-btn" onClick={() => startEditTeacher(teacher)}>Ubah</button></div>)}</div>
          </div>
        )}

        {activeTab === 'students' && currentUser?.role === 'principal' && (
          <div className="view-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}><span>Halaman {studentMeta.page} dari {studentTotalPages} — {studentMeta.total} siswa</span><div><button type="button" className="save-btn" disabled={studentPage <= 1} onClick={() => setStudentPage((page) => page - 1)}>Sebelumnya</button> <button type="button" className="save-btn" disabled={studentPage >= studentTotalPages} onClick={() => setStudentPage((page) => page + 1)}>Berikutnya</button></div></div>
            {studentError && <p role="alert" style={{ color: '#b91c1c' }}>{studentError}</p>}
            {studentDetail && <div className="profile-details-card" style={{ marginBottom: '20px' }}><h3>Detail Siswa</h3><p><strong>{studentDetail.name}</strong> — NIS: {studentDetail.nis || '-'} — Kelas: {studentDetail.classroom_name || '-'}</p><p>Rata-rata fokus: {studentDetail.metrics_summary?.avg_focus_score ?? 0} | Terdistraksi: {studentDetail.metrics_summary?.avg_distracted_score ?? 0} | Total angkat tangan: {studentDetail.metrics_summary?.total_raised_hand_count ?? 0}</p></div>}
            <div className="profile-details-card"><h3 className="profile-section-title"><User size={18} color="#6366f1" /><span>{editingStudentId ? 'Ubah Siswa' : 'Tambah Siswa'}</span></h3>{studentFormMessage && <p style={{ color: '#047857' }}>{studentFormMessage}</p>}<form onSubmit={handleStudentSubmit}><div className="profile-fields-grid"><div className="profile-field-group"><label>Nama</label><input required value={studentForm.name} onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })} /></div><div className="profile-field-group"><label>NIS</label><input required value={studentForm.nis} onChange={(e) => setStudentForm({ ...studentForm, nis: e.target.value })} /></div><div className="profile-field-group"><label>Kelas</label><select required value={studentForm.classroom_id} onChange={(e) => setStudentForm({ ...studentForm, classroom_id: e.target.value })}><option value="">Pilih kelas</option>{classroomOptions.map((classroom) => <option key={classroom.id} value={classroom.id}>{classroom.name}</option>)}</select></div><div className="profile-field-group"><label>Foto {editingStudentId ? '(opsional)' : ''}</label><input required={!editingStudentId} type="file" accept="image/*" onChange={(e) => setStudentForm({ ...studentForm, file: e.target.files?.[0] || null })} /></div></div><div style={{ marginTop: '20px' }}><button type="submit" className="btn-primary">{editingStudentId ? 'Simpan Perubahan' : 'Buat Siswa'}</button>{editingStudentId && <button type="button" className="save-btn" onClick={resetStudentForm}>Batal</button>}</div></form></div>
          </div>
        )}

      </main>
    </div>
  );
}
