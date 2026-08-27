import {
  useEffect,
  useState,
  createClassroomSession,
  endClassroomSession,
  endEvaluation,
  getClassroomSessionDetail,
  getClassroomSessions,
  getSessionAttendance,
  getSessionEvaluationStatus,
  listCollection,
  registerStudentPose,
  startEvaluation,
} from '../imports';

const EMPTY_SESSION_FORM = { classroom_id: '', camera_id: '', subject: '' };

/** Ubah respons kehadiran backend menjadi opsi dropdown absensi. */
const toAttendanceOptions = (students) => (Array.isArray(students)
  ? students.map((student) => ({
    id: student.id,
    name: student.name,
    nis: student.nis ?? '',
    status: student.status,
  }))
  : []);

/**
 * Owns classroom sessions: list, create form, detail modal and teacher session actions.
 */
export function useSessions({
  authToken,
  activeTab,
  searchQuery,
  setBackendMessage,
  reloadCameraOptions,
  onMonitorStream,
  onEvaluationStarted,
  classroomDetail,
  setClassroomDetail,
}) {
  const [sessions, setSessions] = useState([]);
  const [sessionPage, setSessionPage] = useState(1);
  const [sessionMeta, setSessionMeta] = useState({ total: 0, page: 1, size: 10 });
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState('');

  const [sessionForm, setSessionForm] = useState(EMPTY_SESSION_FORM);
  const [isSessionFormOpen, setIsSessionFormOpen] = useState(false);
  const [sessionFormError, setSessionFormError] = useState('');
  const [sessionFormMessage, setSessionFormMessage] = useState('');
  const [isSessionSaving, setIsSessionSaving] = useState(false);

  const [sessionDetail, setSessionDetail] = useState(null);
  const [sessionDetailLoading, setSessionDetailLoading] = useState(false);
  const [sessionDetailError, setSessionDetailError] = useState('');
  const [isSessionDetailOpen, setIsSessionDetailOpen] = useState(false);
  // 'idle' | 'register' | 'start-eval' | 'end-eval' | 'end-session'
  const [sessionActionState, setSessionActionState] = useState('idle');
  const [sessionActionMessage, setSessionActionMessage] = useState(null);
  // Status evaluasi hanya disimpan di memori stream backend, jadi UI melacaknya sendiri.
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [registerStudentId, setRegisterStudentId] = useState('');
  const [registerStudentOptions, setRegisterStudentOptions] = useState([]);

  useEffect(() => {
    if (!authToken || !['sessions', 'live'].includes(activeTab)) return undefined;
    let isActive = true;

    const loadSessions = async () => {
      setSessionLoading(true);
      setSessionError('');
      try {
        const response = await listCollection('/classroom-sessions', authToken, {
          page: sessionPage,
          size: 10,
          search: searchQuery.trim(),
        });
        if (isActive) {
          setSessions(response.items);
          setSessionMeta(response.meta);
        }
      } catch (error) {
        if (isActive) {
          setSessionError(error instanceof Error ? error.message : 'Gagal mengambil daftar sesi.');
        }
      } finally {
        if (isActive) setSessionLoading(false);
      }
    };

    loadSessions();
    return () => { isActive = false; };
  }, [activeTab, authToken, sessionPage, searchQuery]);

  const resetSessionForm = () => {
    setSessionForm(EMPTY_SESSION_FORM);
    setSessionFormError('');
    setSessionFormMessage('');
    setIsSessionFormOpen(false);
  };

  const openSessionForm = async () => {
    resetSessionForm();
    await reloadCameraOptions?.();
    setIsSessionFormOpen(true);
  };

  const prefillClassroom = (classroomId) => {
    setSessionForm((previous) => ({ ...previous, classroom_id: classroomId }));
  };

  const handleSessionSubmit = async (event) => {
    event.preventDefault();
    setSessionFormError('');
    setSessionFormMessage('');

    if (!sessionForm.classroom_id || !sessionForm.camera_id) {
      setSessionFormError('Kelas dan kamera wajib dipilih untuk membuat sesi.');
      return;
    }

    setIsSessionSaving(true);
    try {
      const classroomId = sessionForm.classroom_id;
      await createClassroomSession({
        classroom_id: sessionForm.classroom_id,
        camera_id: sessionForm.camera_id,
        subject: sessionForm.subject || '',
      }, authToken);

      setSessionFormMessage('Sesi berhasil dibuat.');
      resetSessionForm();
      setSessionPage(1);

      const [listResponse, classroomSessionsResponse] = await Promise.all([
        listCollection('/classroom-sessions', authToken, { page: 1, size: 10, search: searchQuery.trim() }),
        getClassroomSessions(classroomId, authToken, { page: 1, size: 10 }),
      ]);

      setSessions(listResponse.items);
      setSessionMeta(listResponse.meta);

      if (classroomDetail?.classroom?.id === classroomId) {
        const rawClassroomSessions = Array.isArray(classroomSessionsResponse.items)
          ? classroomSessionsResponse.items
          : [];

        const mapped = rawClassroomSessions.map((session) => ({
          id: session.id ?? session.session_id ?? session.sessionId,
          subject: session.subject ?? session.title ?? '',
          start_time: session.start_time ?? session.startTime ?? null,
          end_time: session.end_time ?? session.endTime ?? null,
          teacher_name: session.teacher_name ?? session.teacherName ?? session.teacher ?? null,
          status: session.status ?? null,
          metrics: session.metrics ?? null,
          ...session,
        }));

        setClassroomDetail?.((previous) => (previous ? { ...previous, sessions: mapped } : previous));
      }
    } catch (error) {
      setSessionFormError(error instanceof Error ? error.message : 'Gagal membuat sesi.');
    } finally {
      setIsSessionSaving(false);
    }
  };

  const handleSessionDetail = async (sessionId) => {
    setSessionDetailError('');
    setSessionDetailLoading(true);
    setIsSessionDetailOpen(true);
    setSessionDetail(null);
    setRegisterStudentOptions([]);
    setRegisterStudentId('');
    setSessionActionMessage(null);
    setSessionActionState('idle');
    setIsEvaluating(false);

    try {
      const response = await getClassroomSessionDetail(sessionId, authToken);
      const sessionData = response.data?.data ?? response.data ?? null;
      setSessionDetail(sessionData);

      if (!sessionData) {
        setSessionDetailError('Data sesi tidak tersedia.');
      }

      if (sessionData) {
        // Status kehadiran dan status evaluasi diambil dari backend supaya
        // tetap benar walau modal ditutup, halaman di-refresh, atau pengguna
        // sempat berpindah menu.
        const [attendanceResult, evaluationResult] = await Promise.allSettled([
          getSessionAttendance(sessionId, authToken),
          getSessionEvaluationStatus(sessionId, authToken),
        ]);

        if (attendanceResult.status === 'fulfilled') {
          setRegisterStudentOptions(toAttendanceOptions(attendanceResult.value.data));
        }

        if (evaluationResult.status === 'fulfilled') {
          setIsEvaluating(Boolean(evaluationResult.value.data?.is_evaluating));
        }
      }
    } catch (error) {
      setSessionDetailError(error instanceof Error ? error.message : 'Gagal mengambil detail sesi.');
    } finally {
      setSessionDetailLoading(false);
    }
  };

  const closeSessionDetail = () => {
    setIsSessionDetailOpen(false);
    setSessionDetail(null);
    setSessionDetailError('');
    setSessionDetailLoading(false);
    setSessionActionMessage(null);
    setSessionActionState('idle');
  };

  const notify = (type, text) => {
    setSessionActionMessage({ type, text });
    setBackendMessage(text);
  };

  const requireAuth = () => {
    if (!authToken) {
      notify('error', 'Silakan login terlebih dahulu untuk melakukan aksi sesi.');
      return false;
    }
    return true;
  };

  const errorText = (error, fallback) => (error instanceof Error ? error.message : fallback);

  /**
   * Semua aksi backend (absensi maupun evaluasi) mensyaratkan stream kamera
   * sudah aktif di sisi server. Karena itu stream dinyalakan lebih dulu lalu
   * diberi jeda singkat supaya frame pertama sempat masuk.
   */
  const ensureStreamReady = async (sessionId) => {
    await onMonitorStream?.(sessionId);
    await new Promise((resolve) => setTimeout(resolve, 1200));
  };

  const handleRegisterStudentPose = async (sessionId) => {
    if (!requireAuth()) return;

    if (!registerStudentId) {
      notify('error', 'Pilih siswa terlebih dahulu sebelum melakukan absensi.');
      return;
    }

    setSessionActionState('register');
    notify('info', 'Menyiapkan kamera, minta siswa mengangkat tangan...');

    try {
      await ensureStreamReady(sessionId);
      const response = await registerStudentPose(sessionId, authToken, registerStudentId);
      const data = response.data ?? null;

      if (data) {
        setSessionDetail((previous) => (previous ? {
          ...previous,
          present_count: data.present_count,
          absent_count: data.absent_count,
        } : previous));

      }

      // Respons register hanya memuat siswa yang sudah punya kursi, sehingga
      // daftar lengkap diambil ulang agar siswa yang belum diabsen tetap ada.
      const attendanceResponse = await getSessionAttendance(sessionId, authToken);
      setRegisterStudentOptions(toAttendanceOptions(attendanceResponse.data));

      setRegisterStudentId('');
      notify('success', response.message || 'Siswa berhasil diabsen dan posisinya disimpan.');
    } catch (error) {
      console.error(error);
      notify('error', errorText(error, 'Gagal melakukan absensi siswa.'));
    } finally {
      setSessionActionState('idle');
    }
  };

  const handleStartEvaluation = async (sessionId) => {
    if (!requireAuth()) return;

    setSessionActionState('start-eval');
    notify('info', 'Menyalakan stream dan memulai evaluasi...');

    try {
      await ensureStreamReady(sessionId);
      const response = await startEvaluation(sessionId, authToken);
      setIsEvaluating(true);
      notify('success', response.message || 'Evaluasi AI dimulai. Metrik sedang dicatat.');
      // Langsung arahkan guru ke halaman Live Camera Feed yang sudah
      // menampilkan sesi yang barusan dievaluasi.
      onEvaluationStarted?.(sessionId);
      setIsSessionDetailOpen(false);
    } catch (error) {
      console.error(error);
      setIsEvaluating(false);
      notify('error', errorText(error, 'Gagal memulai evaluasi.'));
    } finally {
      setSessionActionState('idle');
    }
  };

  const handleEndEvaluation = async (sessionId) => {
    if (!requireAuth()) return;

    setSessionActionState('end-eval');
    notify('info', 'Menghentikan evaluasi...');

    try {
      const response = await endEvaluation(sessionId, authToken);
      setIsEvaluating(false);
      notify('success', response.message || 'Evaluasi AI dihentikan. Kamera tetap standby untuk absensi.');
    } catch (error) {
      console.error(error);
      notify('error', errorText(error, 'Gagal menghentikan evaluasi.'));
    } finally {
      setSessionActionState('idle');
    }
  };

  const handleEndClassroomSession = async (sessionId) => {
    if (!requireAuth()) return;

    if (!window.confirm('Apakah Anda yakin ingin mengakhiri sesi ini? Metrik akan direkap dan sesi tidak dapat dilanjutkan.')) {
      notify('info', 'Aksi dibatalkan, sesi tidak diakhiri.');
      return;
    }

    setSessionActionState('end-session');
    notify('info', 'Mengakhiri sesi dan merekap metrik...');

    try {
      const response = await endClassroomSession(sessionId, authToken);
      setIsEvaluating(false);

      const endedAt = new Date().toISOString();

      setSessionDetail((previous) => (previous && String(previous.id) === String(sessionId)
        ? { ...previous, status: 'FINISHED', end_time: endedAt }
        : previous));

      setSessions((previous) => previous.map((session) => (String(session.id) === String(sessionId)
        ? { ...session, status: 'FINISHED', end_time: endedAt }
        : session)));

      notify('success', response.message || 'Sesi kelas berhasil diakhiri, metrik berhasil direkap.');

      const listResponse = await listCollection('/classroom-sessions', authToken, { page: 1, size: 10 });
      setSessions(listResponse.items || []);
    } catch (error) {
      console.error(error);
      notify('error', errorText(error, 'Gagal mengakhiri sesi.'));
    } finally {
      setSessionActionState('idle');
    }
  };

  return {
    sessions,
    setSessions,
    sessionPage,
    setSessionPage,
    sessionMeta,
    sessionLoading,
    sessionError,
    sessionForm,
    setSessionForm,
    isSessionFormOpen,
    sessionFormError,
    sessionFormMessage,
    isSessionSaving,
    sessionDetail,
    sessionDetailLoading,
    sessionDetailError,
    isSessionDetailOpen,
    sessionActionState,
    sessionActionMessage,
    isEvaluating,
    registerStudentId,
    setRegisterStudentId,
    registerStudentOptions,
    resetSessionForm,
    openSessionForm,
    prefillClassroom,
    handleSessionSubmit,
    handleSessionDetail,
    closeSessionDetail,
    handleRegisterStudentPose,
    handleStartEvaluation,
    handleEndEvaluation,
    handleEndClassroomSession,
  };
}

export default useSessions;
