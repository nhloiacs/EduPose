import {
  useEffect,
  useState,
  createClassroomSession,
  endClassroomSession,
  endEvaluation,
  getClassroomSessionDetail,
  getClassroomSessions,
  getClassroomStudents,
  listCollection,
  registerStudentPose,
  startEvaluation,
} from '../imports';

const EMPTY_SESSION_FORM = { classroom_id: '', camera_id: '', subject: '' };

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
  const [sessionActionState, setSessionActionState] = useState('idle');
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

    try {
      const response = await getClassroomSessionDetail(sessionId, authToken);
      const sessionData = response.data?.data ?? response.data ?? null;
      setSessionDetail(sessionData);

      if (!sessionData) {
        setSessionDetailError('Data sesi tidak tersedia.');
      }

      if (sessionData?.classroom_id) {
        const studentResponse = await getClassroomStudents(sessionData.classroom_id, authToken, { page: 1, size: 50 });
        const options = Array.isArray(studentResponse.items)
          ? studentResponse.items.map((student) => ({
            id: student.id,
            label: `${student.name}${student.nis ? ` (${student.nis})` : ''}`,
          }))
          : [];
        setRegisterStudentOptions(options);
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
  };

  const requireAuth = () => {
    if (!authToken) {
      setBackendMessage('Silakan login untuk melakukan aksi sesi');
      return false;
    }
    return true;
  };

  const handleRegisterStudentPose = async (sessionId) => {
    if (!requireAuth()) return;

    if (!registerStudentId) {
      setBackendMessage('Pilih siswa terlebih dahulu sebelum register pose.');
      return;
    }

    setBackendMessage('Mendaftarkan pose siswa...');
    setSessionActionState('loading');
    try {
      const response = await registerStudentPose(sessionId, authToken, registerStudentId);
      const data = response.data ?? null;
      if (data) {
        setSessionDetail((previous) => (previous ? {
          ...previous,
          present_count: data.present_count,
          absent_count: data.absent_count,
        } : previous));
      }
      setBackendMessage(response.message || 'Register student pose selesai');
    } catch (error) {
      console.error(error);
      setBackendMessage(error instanceof Error ? error.message : 'Gagal register student pose');
    } finally {
      setSessionActionState('idle');
    }
  };

  const handleStartEvaluation = async (sessionId) => {
    if (!requireAuth()) return;

    setBackendMessage('Memulai evaluasi...');
    setSessionActionState('loading');
    try {
      await onMonitorStream?.(sessionId);
      // Beri jeda singkat agar stream sempat siap di backend.
      await new Promise((resolve) => setTimeout(resolve, 800));
      const response = await startEvaluation(sessionId, authToken);
      setBackendMessage(response.message || String(response.data ?? 'Evaluation started'));
    } catch (error) {
      console.error(error);
      setBackendMessage(error instanceof Error ? error.message : 'Gagal start evaluation');
    } finally {
      setSessionActionState('idle');
    }
  };

  const handleEndEvaluation = async (sessionId) => {
    if (!requireAuth()) return;

    setBackendMessage('Mengakhiri evaluasi...');
    setSessionActionState('loading');
    try {
      const response = await endEvaluation(sessionId, authToken);
      setBackendMessage(response.message || String(response.data ?? 'Evaluation ended'));
    } catch (error) {
      console.error(error);
      setBackendMessage(error instanceof Error ? error.message : 'Gagal end evaluation');
    } finally {
      setSessionActionState('idle');
    }
  };

  const handleEndClassroomSession = async (sessionId) => {
    if (!requireAuth()) return;

    if (!window.confirm('Apakah Anda yakin ingin mengakhiri sesi ini?')) {
      setBackendMessage('Aksi batalkan: sesi tidak diakhiri.');
      return;
    }

    setBackendMessage('Mengakhiri sesi...');
    setSessionActionState('loading');
    try {
      const response = await endClassroomSession(sessionId, authToken);
      setBackendMessage(response.message || String(response.data ?? 'Session ended'));

      const endedAt = new Date().toISOString();

      setSessionDetail((previous) => (previous && previous.id === sessionId
        ? { ...previous, status: 'ended', end_time: endedAt }
        : previous));

      setSessions((previous) => previous.map((session) => (String(session.id) === String(sessionId)
        ? { ...session, status: 'ended', end_time: endedAt }
        : session)));

      const listResponse = await listCollection('/classroom-sessions', authToken, { page: 1, size: 10 });
      setSessions(listResponse.items || []);
    } catch (error) {
      console.error(error);
      setBackendMessage(error instanceof Error ? error.message : 'Gagal mengakhiri sesi');
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
