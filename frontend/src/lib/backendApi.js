import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Award,
  BarChart3,
  BookOpen,
  Calendar,
  Camera,
  Clock,
  Cpu,
  Eye,
  LayoutDashboard,
  PencilLine,
  Plus,
  Save,
  Search,
  Settings,
  Trash2,
  TrendingDown,
  TrendingUp,
  User,
  Users,
  Video,
  XCircle,
} from 'lucide-react';
import { Bar as ChartBar, Line as ChartLine, Doughnut as ChartDoughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, Filler, Legend, LineElement, LinearScale, PointElement, Title, Tooltip } from 'chart.js';
export { useEffect, useRef, useState };
export { AlertCircle, Award, BarChart3, BookOpen, Calendar, Camera, Clock, Cpu, Eye, LayoutDashboard, PencilLine, Plus, Save, Search, Settings, Trash2, TrendingDown, TrendingUp, User, Users, Video, XCircle };
export { ChartJS, ArcElement, BarElement, CategoryScale, Filler, Legend, LineElement, LinearScale, PointElement, Title, Tooltip, ChartBar as Bar, ChartLine as Line, ChartDoughnut as Doughnut };

const DEFAULT_API_BASE_URL = '/api';

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL).replace(/\/$/, '');
// Mengubah http/https menjadi ws/wss untuk koneksi WebSocket
// Build WS URL secara dinamis
export const WS_BASE_URL = (() => {
  // Kalau VITE_API_BASE_URL di-set eksplisit (misal http://localhost:8000)
  if (API_BASE_URL.startsWith('http')) {
    return API_BASE_URL.replace(/^http/, 'ws');
  }
  // Kalau path relatif (misal '/api'), gabungkan dengan domain/port browser saat ini
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}${API_BASE_URL}`;
})();

/** URL WebSocket untuk menerima notifikasi alert dari backend */
export const getNotificationWsUrl = (sessionId) =>
  `${WS_BASE_URL}/stream/notifications/${sessionId}`;

/** URL WebSocket untuk mengirim frame webcam dari frontend (Demo Mode) */
export const getUploadFrameWsUrl = (sessionId) =>
  `${WS_BASE_URL}/stream/upload-frame/${sessionId}`;


export const AUTH_STORAGE_KEY = 'attentionai.auth.session';

let activeAuthToken = '';

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const toQueryString = (params = {}) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    searchParams.set(key, String(value));
  });

  const query = searchParams.toString();
  return query ? `?${query}` : '';
};

export const buildApiUrl = (path, params) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}${params ? toQueryString(params) : ''}`;
};

export const setApiAuthToken = (token = '') => {
  activeAuthToken = typeof token === 'string' ? token.trim() : '';
};

export const getApiAuthToken = () => activeAuthToken;

export const readStoredSession = () => {
  if (typeof window === 'undefined') {
    return { token: '', user: null };
  }

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return { token: '', user: null };
    }

    const parsed = JSON.parse(raw);
    return {
      token: typeof parsed.token === 'string' ? parsed.token : '',
      user: parsed.user ?? null,
    };
  } catch {
    return { token: '', user: null };
  }
};

export const persistSession = (session) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  setApiAuthToken(session?.token ?? '');
};

export const clearStoredSession = () => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  setApiAuthToken('');
};

const parseJson = async (response) => {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

export const normalizeBaseResponse = (payload) => {
  if (!isPlainObject(payload)) {
    return {
      message: '',
      data: payload ?? null,
      raw: payload,
    };
  }

  return {
    message: typeof payload.message === 'string' ? payload.message : '',
    data: Object.prototype.hasOwnProperty.call(payload, 'data') ? payload.data ?? null : null,
    raw: payload,
  };
};

export const normalizePaginatedResponse = (payload) => {
  const baseResponse = normalizeBaseResponse(payload);
  const responseData = baseResponse.data;

  const items = Array.isArray(responseData?.items)
    ? responseData.items
    : Array.isArray(responseData)
      ? responseData
      : Array.isArray(baseResponse.raw?.items)
        ? baseResponse.raw.items
        : [];

  const metaSource = isPlainObject(responseData?.meta)
    ? responseData.meta
    : isPlainObject(baseResponse.raw?.meta)
      ? baseResponse.raw.meta
      : {};

  const total = Number(metaSource.total ?? items.length ?? 0);
  const page = Number(metaSource.page ?? 1);
  const size = Number(metaSource.size ?? items.length ?? 0);

  return {
    ...baseResponse,
    items,
    meta: {
      total: Number.isFinite(total) ? total : items.length,
      page: Number.isFinite(page) ? page : 1,
      size: Number.isFinite(size) ? size : items.length,
    },
  };
};

const applyRequestInterceptors = (config) => {
  const headers = { ...(config.headers ?? {}) };
  const resolvedToken = typeof config.token === 'string' && config.token.trim() ? config.token.trim() : activeAuthToken;

  if (!headers.Authorization && !config.skipAuth && resolvedToken) {
    headers.Authorization = `Bearer ${resolvedToken}`;
  }

  if (config.body !== undefined && !(config.body instanceof FormData) && !headers['Content-Type'] && !headers['content-type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (!headers.Accept && !headers.accept) {
    headers.Accept = 'application/json';
  }

  return {
    ...config,
    headers,
  };
};

export const apiRequest = async (config) => {
  const preparedConfig = applyRequestInterceptors(config);
  const url = buildApiUrl(preparedConfig.path, preparedConfig.params);
  
  console.log('API Request:', {
    url,
    method: preparedConfig.method ?? 'GET',
    headers: preparedConfig.headers,
    hasAuth: !!preparedConfig.headers.Authorization,
  });

  const response = await fetch(url, {
    method: preparedConfig.method ?? 'GET',
    headers: preparedConfig.headers,
    body: preparedConfig.body instanceof FormData
      ? preparedConfig.body
      : preparedConfig.body !== undefined
        ? JSON.stringify(preparedConfig.body)
        : undefined,
  });

  const payload = await parseJson(response);

  if (!response.ok) {
    if (response.status === 401) {
      clearStoredSession();
      window.location.reload(); 
      throw new Error('Sesi Anda telah berakhir. Silakan login kembali.');
    }

    const baseMessage = normalizeBaseResponse(payload).message || '';

    let detailMsg = '';
    const detail = payload?.detail;
    if (Array.isArray(detail)) {
      detailMsg = detail
        .map((item) => {
          if (!item) return '';
          if (typeof item === 'string') return item;
          if (typeof item.msg === 'string') return item.msg;
          try { return JSON.stringify(item); } catch { return String(item); }
        })
        .filter(Boolean)
        .join('; ');
    } else if (typeof detail === 'string') {
      detailMsg = detail;
    }

    const serverFallback = response.status >= 500
      ? `Terjadi kesalahan di server (HTTP ${response.status}). Periksa log backend untuk detailnya.`
      : `Permintaan gagal dengan status ${response.status}.`;

    const errorMessage = baseMessage || detailMsg || payload?.message || serverFallback;
    throw new Error(errorMessage);
  }

  return payload;
};

export const loginRequest = (email, password) => {
  return apiRequest({
    path: '/auth/login',
    method: 'POST',
    body: { email, password },
    skipAuth: true,
  }).then((payload) => normalizeBaseResponse(payload));
};

export const checkBackendHealth = async () => {
  const response = await fetch(buildApiUrl('/'));

  if (!response.ok) {
    throw new Error(`Backend health check failed with status ${response.status}`);
  }

  return response.json();
};

export const listCollection = (resourcePath, token, params = {}) => {
  let normalizedPath = resourcePath.startsWith('/') ? resourcePath : `/${resourcePath}`;

  const pathSegments = normalizedPath.split('/').filter(Boolean);
  if (!normalizedPath.endsWith('/') && pathSegments.length === 1) {
    normalizedPath += '/';
  }

  return apiRequest({
    path: normalizedPath,
    method: 'GET',
    token,
    params,
  }).then((payload) => normalizePaginatedResponse(payload));
};

export const getCurrentTeacherProfile = (token) =>
  apiRequest({
    path: '/auth/profile',
    method: 'GET',
    token,
  }).then((payload) => normalizeBaseResponse(payload));

const appendTeacherFormValue = (formData, key, value) => {
  if (value !== undefined && value !== null && value !== '') {
    formData.append(key, value);
  }
};

export const createTeacher = (teacher, token) => {
  const formData = new FormData();
  ['name', 'email', 'role', 'password', 'nip', 'file'].forEach((key) => appendTeacherFormValue(formData, key, teacher[key]));

  return apiRequest({
    path: '/teachers/',
    method: 'POST',
    token,
    body: formData,
  }).then((payload) => normalizeBaseResponse(payload));
};

export const updateTeacher = (teacherId, teacher, token) => {
  const formData = new FormData();
  ['name', 'email', 'role', 'nip', 'file'].forEach((key) => appendTeacherFormValue(formData, key, teacher[key]));

  return apiRequest({
    path: `/teachers/${teacherId}`,
    method: 'PATCH',
    token,
    body: formData,
  }).then((payload) => normalizeBaseResponse(payload));
};

export const deleteTeacher = (teacherId, token) =>
  apiRequest({ path: `/teachers/${teacherId}`, method: 'DELETE', token })
    .then((payload) => normalizeBaseResponse(payload));

export const getTeacherEdit = (teacherId, token) =>
  apiRequest({ path: `/teachers/${teacherId}/edit`, method: 'GET', token })
    .then((payload) => normalizeBaseResponse(payload));

export const getTeacherDetail = (teacherId, token) =>
  apiRequest({ path: `/teachers/${teacherId}`, method: 'GET', token })
    .then((payload) => normalizeBaseResponse(payload));

export const getTeacherSessions = (teacherId, token, params = {}) =>
  listCollection(`/teachers/${teacherId}/sessions`, token, params);

export const getAllTeachers = (token, params = {}) =>
  apiRequest({ path: '/teachers/', method: 'GET', token, params })
    .then((payload) => normalizeBaseResponse(payload));

export const getStudentEdit = (studentId, token) =>
  apiRequest({ path: `/students/${studentId}/edit`, method: 'GET', token })
    .then((payload) => normalizeBaseResponse(payload));

export const getStudentSessions = (studentId, token, params = {}) =>
  listCollection(`/students/${studentId}/sessions`, token, params);

export const getAllStudents = (token, params = {}) =>
  apiRequest({ path: '/students/', method: 'GET', token, params })
    .then((payload) => normalizeBaseResponse(payload));

export const getStudentDetail = (studentId, token) =>
  apiRequest({ path: `/students/${studentId}`, method: 'GET', token })
    .then((payload) => normalizeBaseResponse(payload));

export const createStudent = (student, token) => {
  const formData = new FormData();
  ['name', 'nis', 'classroom_id', 'file'].forEach((key) => appendTeacherFormValue(formData, key, student[key]));
  return apiRequest({ path: '/students/', method: 'POST', token, body: formData })
    .then((payload) => normalizeBaseResponse(payload));
};

export const updateStudent = (studentId, student, token) => {
  const formData = new FormData();
  ['name', 'nis', 'classroom_id', 'file'].forEach((key) => appendTeacherFormValue(formData, key, student[key]));
  return apiRequest({ path: `/students/${studentId}`, method: 'PATCH', token, body: formData })
    .then((payload) => normalizeBaseResponse(payload));
};

export const deleteStudent = (studentId, token) =>
  apiRequest({ path: `/students/${studentId}`, method: 'DELETE', token })
    .then((payload) => normalizeBaseResponse(payload));

export const getClassroomOptions = (token) =>
  apiRequest({ path: '/classrooms/select', method: 'GET', token })
    .then((payload) => normalizeBaseResponse(payload));

export const getCameraOptions = (token) =>
  apiRequest({ path: '/cameras/select', method: 'GET', token })
    .then((payload) => normalizeBaseResponse(payload));

export const getCameraList = (token, params = {}) =>
  listCollection('/cameras', token, params);

export const getCameraDetail = (cameraId, token) =>
  apiRequest({ path: `/cameras/${cameraId}`, method: 'GET', token })
    .then((payload) => normalizeBaseResponse(payload));

export const createCamera = (camera, token) =>
  apiRequest({ path: '/cameras/', method: 'POST', token, body: camera })
    .then((payload) => normalizeBaseResponse(payload));

export const updateCamera = (cameraId, camera, token) =>
  apiRequest({ path: `/cameras/${cameraId}`, method: 'PATCH', token, body: camera })
    .then((payload) => normalizeBaseResponse(payload));

export const deleteCamera = (cameraId, token) =>
  apiRequest({ path: `/cameras/${cameraId}`, method: 'DELETE', token })
    .then((payload) => normalizeBaseResponse(payload));

export const getClassroomDetail = (classroomId, token) =>
  apiRequest({ path: `/classrooms/${classroomId}`, method: 'GET', token })
    .then((payload) => normalizeBaseResponse(payload));

export const getClassroomSessions = (classroomId, token, params = {}) =>
  listCollection(`/classrooms/${classroomId}/sessions`, token, params);

export const createClassroomSession = (sessionData, token) =>
  apiRequest({ path: '/classroom-sessions/', method: 'POST', token, body: sessionData })
    .then((payload) => normalizeBaseResponse(payload));

export const getClassroomSessionDetail = (sessionId, token) =>
  apiRequest({ path: `/classroom-sessions/${sessionId}`, method: 'GET', token })
    .then((payload) => normalizeBaseResponse(payload));

export const getSessionAttendance = (sessionId, token) =>
  apiRequest({
    path: `/classroom-sessions/${sessionId}/attendance`,
    method: 'GET',
    token,
  }).then((payload) => normalizeBaseResponse(payload));

export const getSessionEvaluationStatus = (sessionId, token) =>
  apiRequest({
    path: `/classroom-sessions/${sessionId}/evaluation-status`,
    method: 'GET',
    token,
  }).then((payload) => normalizeBaseResponse(payload));

export const getSessionLiveDetections = (sessionId, token) =>
  apiRequest({
    path: `/classroom-sessions/${sessionId}/live-detections`,
    method: 'GET',
    token,
  }).then((payload) => normalizeBaseResponse(payload));

/** Terjemahan status kehadiran dari backend ke label berbahasa Indonesia. */
export const ATTENDANCE_LABELS = {
  PRESENT: 'Hadir',
  ABSENT: 'Tidak hadir',
  NOT_REGISTERED: 'Belum diabsen',
};

export const attendanceLabel = (status) => ATTENDANCE_LABELS[status] ?? 'Belum diabsen';

/** Label pose hasil deteksi kamera dalam bahasa Indonesia. */
export const DETECTION_LABELS = {
  focus: 'Fokus',
  distracted: 'Tidak Fokus',
  'raise-hand': 'Angkat Tangan',
};

export const detectionLabel = (label) => DETECTION_LABELS[label] ?? 'Tidak Terdeteksi';

export const registerStudentPose = (sessionId, token, studentId) =>
  apiRequest({
    path: `/classroom-sessions/${sessionId}/register-student`,
    method: 'POST',
    token,
    body: studentId ? { student_id: studentId } : undefined,
  }).then((payload) => normalizeBaseResponse(payload));

export const startEvaluation = (sessionId, token) =>
  apiRequest({ path: `/classroom-sessions/${sessionId}/start-eval`, method: 'POST', token })
    .then((payload) => normalizeBaseResponse(payload));

export const getMonitorStreamUrl = (sessionId) =>
  `${API_BASE_URL}/stream/monitor/${sessionId}`;

export const monitorStream = getMonitorStreamUrl;

export const endEvaluation = (sessionId, token) =>
  apiRequest({ path: `/classroom-sessions/${sessionId}/end-eval`, method: 'POST', token })
    .then((payload) => normalizeBaseResponse(payload));

export const endClassroomSession = (sessionId, token) =>
  apiRequest({ path: `/classroom-sessions/${sessionId}/end`, method: 'POST', token })
    .then((payload) => normalizeBaseResponse(payload));

export const getClassroomStudents = (classroomId, token, params = {}) =>
  listCollection(`/classrooms/${classroomId}/students`, token, params);

export const createClassroom = (classroom, token) =>
  apiRequest({ path: '/classrooms/', method: 'POST', token, body: classroom })
    .then((payload) => normalizeBaseResponse(payload));

export const updateClassroom = (classroomId, classroom, token) =>
  apiRequest({ path: `/classrooms/${classroomId}`, method: 'PATCH', token, body: classroom })
    .then((payload) => normalizeBaseResponse(payload));

export const deleteClassroom = (classroomId, token) =>
  apiRequest({ path: `/classrooms/${classroomId}`, method: 'DELETE', token })
    .then((payload) => normalizeBaseResponse(payload));

export const getPaginatedCollection = (response) => normalizePaginatedResponse(response);

export const getBaseResponseData = (response) => normalizeBaseResponse(response).data;

export const getBaseResponseMessage = (response) => normalizeBaseResponse(response).message;

export const mergeStudentsFromBackend = (remoteStudents = []) => {
  if (!Array.isArray(remoteStudents) || remoteStudents.length === 0) {
    return [];
  }

  return remoteStudents.map((student, index) => ({
    id: student.id ?? index + 1,
    name: student.name || `Student ${index + 1}`,
    class: student.classroom_name || 'Belum ditentukan',
    attention: Number(student.attention ?? 0),
    emotion: student.emotion || 'Belum tersedia',
    status: student.status || 'Belum tersedia',
    trend: student.trend || 'flat',
    nis: student.nis || '',
    classroom_id: student.classroom_id || '',
    photo_filepath: student.photo_filepath || null,
  }));
};

export const mergeBoxesFromStudents = () => [];

export const buildTeacherProfile = (user, previousProfile) => {
  if (!user) {
    return previousProfile;
  }

  return {
    ...previousProfile,
    name: user.name || previousProfile.name,
    email: user.email || previousProfile.email,
    role: user.role || previousProfile.role,
    photoFilepath: user.photo_filepath || previousProfile.photoFilepath,
    avatarInitials: user.name
      ? user.name
          .split(' ')
          .filter(Boolean)
          .slice(0, 2)
          .map((part) => part[0]?.toUpperCase())
          .join('')
      : previousProfile.avatarInitials,
  };
};

export const formatDateParam = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Rentang tanggal untuk endpoint /dashboard/metrics.
 *
 * Backend memfilter dengan `start_time BETWEEN start_date AND end_date`, dan
 * karena `end_date` bertipe DATE ia diperlakukan sebagai pukul 00:00. Akibatnya
 * sesi yang berjalan HARI INI (mis. pukul 09:00) tidak ikut terhitung bila
 * end_date diisi tanggal hari ini. Karena itu end_date digeser satu hari ke
 * depan supaya data hari ini tetap masuk.
 */
export const getDateRange = (daysBack = 7) => {
  const today = new Date();

  const start = new Date(today);
  start.setDate(today.getDate() - Math.max(daysBack - 1, 0));

  const end = new Date(today);
  end.setDate(today.getDate() + 1);

  return {
    start_date: formatDateParam(start),
    end_date: formatDateParam(end),
  };
};

/**
 * Backend mengirim data metrik sebagai array di `data`, tetapi beberapa
 * endpoint lain membungkusnya di `data.items`. Helper ini menerima keduanya
 * sehingga grafik tidak diam-diam kosong hanya karena bentuk respons berbeda.
 */
export const toMetricArray = (response) => {
  const data = response?.data ?? response;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;

  return [];
};

export const getDashboardSummary = (token) =>
  apiRequest({
    path: '/dashboard/',
    method: 'GET',
    token,
  }).then((payload) => normalizeBaseResponse(payload));

export const getDashboardMetrics = (token, params = {}) =>
  apiRequest({
    path: '/dashboard/metrics',
    method: 'GET',
    token,
    params,
  }).then((payload) => normalizeBaseResponse(payload));

export const getTopPerformers = (token, entity, params = {}) =>
  apiRequest({
    path: `/dashboard/top-performers/${entity}`,
    method: 'GET',
    token,
    params,
  }).then((payload) => normalizeBaseResponse(payload));

export const getDashboardLiveWarnings = (token) =>
  apiRequest({
    path: '/dashboard/live-warnings',
    method: 'GET',
    token,
  }).then((payload) => normalizeBaseResponse(payload));

/** Peringatan real-time dari deteksi kamera pada sesi yang sedang berjalan. */
export const mapLiveWarnings = (items = []) =>
  (Array.isArray(items) ? items : []).map((item, index) => ({
    id: item.id ?? index,
    name: item.name,
    desc: [
      'Terdeteksi tidak fokus',
      item.classroom_name,
      item.subject,
    ].filter(Boolean).join(' — '),
    time: 'Sekarang',
  }));

export const getDashboardWarnings = (token, entity, params = {}) =>
  apiRequest({
    path: `/dashboard/warnings/${entity}`,
    method: 'GET',
    token,
    params,
  }).then((payload) => normalizeBaseResponse(payload));

const formatMetricDateLabel = (value) => {
  if (!value) {
    return '—';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  return parsed.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
  });
};

export const buildDailyAttentionChart = (metrics = []) => {
  const sorted = [...metrics].sort((left, right) => new Date(left.date) - new Date(right.date));

  return {
    labels: sorted.map((metric) => formatMetricDateLabel(metric.date)),
    datasets: [
      {
        label: 'Rata-rata Fokus (%)',
        data: sorted.map((metric) => Number(metric.avg_focus_percentage ?? 0)),
        fill: true,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.06)',
        tension: 0.4,
        borderWidth: 3,
        pointBackgroundColor: '#6366f1',
        pointHoverRadius: 6,
      },
    ],
  };
};

export const buildWeeklyAttentionChart = (metrics = []) => {
  const sorted = [...metrics].sort((left, right) => {
    if (left.year !== right.year) {
      return left.year - right.year;
    }

    return (left.week ?? 0) - (right.week ?? 0);
  });

  return {
    labels: sorted.map((metric) => `Minggu ${metric.week ?? '—'}`),
    datasets: [
      {
        label: 'Fokus',
        data: sorted.map((metric) => Number(metric.avg_focus_percentage ?? 0)),
        backgroundColor: '#6366f1',
        borderRadius: 6,
        barThickness: 16,
      },
      {
        label: 'Tidak Fokus',
        data: sorted.map((metric) => Math.max(0, 100 - Number(metric.avg_focus_percentage ?? 0))),
        backgroundColor: '#f59e0b',
        borderRadius: 6,
        barThickness: 16,
      },
    ],
  };
};

export const buildReportsDailyTrendChart = (metrics = []) => {
  const sorted = [...metrics].sort((left, right) => new Date(left.date) - new Date(right.date));

  return {
    labels: sorted.map((metric) => formatMetricDateLabel(metric.date)),
    datasets: [
      {
        label: 'Fokus %',
        data: sorted.map((metric) => Number(metric.avg_focus_percentage ?? 0)),
        borderColor: '#6366f1',
        backgroundColor: 'transparent',
        tension: 0.35,
        borderWidth: 3,
        pointBackgroundColor: '#6366f1',
      },
      {
        label: 'Tidak Fokus %',
        data: sorted.map((metric) => Math.max(0, 100 - Number(metric.avg_focus_percentage ?? 0))),
        borderColor: '#f59e0b',
        backgroundColor: 'transparent',
        tension: 0.35,
        borderWidth: 3,
        pointBackgroundColor: '#f59e0b',
      },
    ],
  };
};

export const buildClassComparisonChart = (classrooms = []) => {
  const sorted = [...classrooms].sort(
    (left, right) => Number(right.avg_focus_percentage ?? 0) - Number(left.avg_focus_percentage ?? 0),
  );

  return {
    labels: sorted.map((classroom) => classroom.name).filter(Boolean),
    datasets: [
      {
        label: 'Rata-rata Fokus (%)',
        data: sorted.map((classroom) => Number(classroom.avg_focus_percentage ?? 0)),
        backgroundColor: '#6366f1',
        borderRadius: 8,
        barThickness: 32,
      },
    ],
  };
};

export const mapClassroomRankings = (items = []) =>
  [...items]
    .map((item) => ({
      id: item.id,
      name: item.name,
      value: Number(item.avg_focus_percentage ?? 0),
      totalRaisedHand: Number(item.total_raised_hand ?? 0),
      trend: 'up',
    }))
    .sort((left, right) => right.value - left.value);

export const mapStudentWarnings = (items = []) =>
  items.map((item, index) => ({
    id: item.id ?? index,
    name: item.name,
    desc: `Fokus ${Number(item.avg_focus_percentage ?? 0).toFixed(1)}% — di bawah ambang batas`,
    time: 'Baru saja',
  }));

export const mapTopPerformersToStudents = (items = []) =>
  items.map((student, index) => ({
    id: student.id ?? index + 1,
    name: student.name || `Student ${index + 1}`,
    class: student.classroom_name || 'Belum ditentukan',
    attention: Number(student.avg_focus_percentage ?? 0),
    emotion: 'Belum tersedia',
    status: Number(student.avg_focus_percentage ?? 0) >= 70 ? 'Aktif' : 'Tidak Aktif',
    trend: Number(student.avg_focus_percentage ?? 0) >= 70 ? 'up' : 'down',
    nis: student.nis || '',
    classroom_id: student.classroom_id || '',
    photo_filepath: student.photo_filepath || null,
  }));

export const enrichStudentsWithPerformers = (students = [], performers = []) => {
  const performerMap = new Map(performers.map((performer) => [String(performer.id), performer]));

  return students.map((student) => {
    const performer = performerMap.get(String(student.id));

    if (!performer) {
      return student;
    }

    const attention = Number(performer.avg_focus_percentage ?? student.attention ?? 0);

    return {
      ...student,
      attention,
      status: attention >= 70 ? 'Aktif' : 'Tidak Aktif',
      trend: attention >= 70 ? 'up' : 'down',
    };
  });
};

export const getAverageFocusFromMetrics = (metrics = []) => {
  if (!Array.isArray(metrics) || metrics.length === 0) {
    return null;
  }

  const total = metrics.reduce((sum, metric) => sum + Number(metric.avg_focus_percentage ?? 0), 0);
  return (total / metrics.length).toFixed(1);
};

export const formatDateRangeLabel = (daysBack = 7) => {
  const { start_date: startDate, end_date: endDate } = getDateRange(daysBack);
  const formatter = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const start = formatter.format(new Date(`${startDate}T00:00:00`));
  const end = formatter.format(new Date(`${endDate}T00:00:00`));
  return `${start} — ${end}`;
};
