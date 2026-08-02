import {
  useEffect,
  useState,
  createTeacher,
  deleteTeacher,
  getAllTeachers,
  getTeacherDetail,
  getTeacherEdit,
  getTeacherSessions,
  updateTeacher,
} from '../imports';

const EMPTY_TEACHER_FORM = { name: '', email: '', role: 'teacher', password: '', nip: '', file: null };

/**
 * Owns the teacher list, teacher form modal and teacher detail modal.
 */
export function useTeachers({ authToken, activeTab, searchQuery }) {
  const [teachers, setTeachers] = useState([]);
  const [teacherForm, setTeacherForm] = useState(EMPTY_TEACHER_FORM);
  const [editingTeacherId, setEditingTeacherId] = useState(null);
  const [isTeacherFormOpen, setIsTeacherFormOpen] = useState(false);
  const [teacherFormMessage, setTeacherFormMessage] = useState('');
  const [teacherFormError, setTeacherFormError] = useState('');
  const [isTeacherSaving, setIsTeacherSaving] = useState(false);
  const [teacherDetailModal, setTeacherDetailModal] = useState(null);
  const [teacherDetailData, setTeacherDetailData] = useState(null);
  const [teacherSessions, setTeacherSessions] = useState([]);
  const [teacherSessionsError, setTeacherSessionsError] = useState('');
  const [teacherDetailLoading, setTeacherDetailLoading] = useState(false);
  const [teacherErrorMsg, setTeacherErrorMsg] = useState('');

  useEffect(() => {
    if (!authToken || activeTab !== 'teachers') return undefined;
    let isActive = true;

    const loadTeachers = async () => {
      try {
        const response = await getAllTeachers(authToken, { page: 1, size: 100, search: searchQuery.trim() });
        if (isActive) {
          setTeachers(Array.isArray(response.data?.items) ? response.data.items : []);
        }
      } catch (error) {
        if (isActive) {
          setTeacherFormError(
            error instanceof Error ? error.message : 'Gagal mengambil daftar teacher.',
          );
        }
      }
    };

    loadTeachers();
    return () => { isActive = false; };
  }, [activeTab, authToken, searchQuery]);

  const resetTeacherForm = () => {
    setTeacherForm(EMPTY_TEACHER_FORM);
    setEditingTeacherId(null);
    setIsTeacherFormOpen(false);
  };

  const openTeacherCreateModal = () => {
    resetTeacherForm();
    setTeacherFormError('');
    setTeacherFormMessage('');
    setIsTeacherFormOpen(true);
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

      setTeachers((previousTeachers) => (editingTeacherId
        ? previousTeachers.map((teacher) => (String(teacher.id) === String(editingTeacherId)
          ? { ...teacher, ...savedTeacher }
          : teacher))
        : [savedTeacher, ...previousTeachers]));

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
    setIsTeacherFormOpen(true);
    setTeacherFormError('');
    setTeacherFormMessage('');

    (async () => {
      try {
        const response = await getTeacherEdit(teacher.id, authToken);
        const data = response.data ?? {};
        setTeacherForm({
          name: data.name || teacher.name || '',
          email: data.email || teacher.email || '',
          role: data.role || teacher.role || 'teacher',
          password: '',
          nip: data.nip || teacher.nip || '',
          file: null,
        });
      } catch {
        setTeacherForm({
          name: teacher.name || '',
          email: teacher.email || '',
          role: teacher.role || 'teacher',
          password: '',
          nip: teacher.nip || '',
          file: null,
        });
      }
    })();
  };

  const handleViewTeacher = async (teacherId) => {
    setTeacherErrorMsg('');
    setTeacherSessionsError('');
    setTeacherDetailLoading(true);

    try {
      const [detailResp, sessionsResp] = await Promise.allSettled([
        getTeacherDetail(teacherId, authToken),
        getTeacherSessions(teacherId, authToken, { page: 1, size: 20 }),
      ]);

      if (detailResp.status === 'fulfilled') {
        setTeacherDetailData(detailResp.value.data ?? null);
      } else {
        console.error('Teacher detail fetch failed:', detailResp.reason);
        setTeacherDetailData(null);
      }

      if (sessionsResp.status === 'fulfilled') {
        const items = Array.isArray(sessionsResp.value?.items) ? sessionsResp.value.items : [];
        setTeacherSessions(items);
      } else {
        console.error('Teacher sessions fetch failed:', sessionsResp.reason);
        setTeacherSessions([]);
        setTeacherSessionsError(
          sessionsResp.reason instanceof Error
            ? sessionsResp.reason.message
            : String(sessionsResp.reason),
        );
      }

      setTeacherDetailModal(teacherId);
    } catch (error) {
      console.error('handleViewTeacher error:', error);
      setTeacherErrorMsg(
        error instanceof Error ? error.message : 'Gagal mengambil detail teacher.',
      );
    } finally {
      setTeacherDetailLoading(false);
    }
  };

  const closeTeacherDetail = () => {
    setTeacherDetailModal(null);
    setTeacherDetailData(null);
    setTeacherSessions([]);
    setTeacherSessionsError('');
    setTeacherErrorMsg('');
  };

  const handleDeleteTeacher = async (teacher) => {
    if (!window.confirm(`Hapus guru ${teacher.name}?`)) return;
    setTeacherErrorMsg('');
    try {
      await deleteTeacher(teacher.id, authToken);
      setTeachers((previous) => previous.filter((item) => String(item.id) !== String(teacher.id)));
    } catch (error) {
      setTeacherErrorMsg(error instanceof Error ? error.message : 'Gagal menghapus teacher.');
    }
  };

  const filteredTeachers = teachers.filter((teacher) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return [teacher.name, teacher.nip, teacher.email, teacher.role]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });

  return {
    teachers,
    setTeachers,
    filteredTeachers,
    teacherForm,
    setTeacherForm,
    editingTeacherId,
    isTeacherFormOpen,
    teacherFormMessage,
    teacherFormError,
    isTeacherSaving,
    teacherDetailModal,
    teacherDetailData,
    teacherSessions,
    teacherSessionsError,
    teacherDetailLoading,
    teacherErrorMsg,
    resetTeacherForm,
    openTeacherCreateModal,
    handleTeacherSubmit,
    startEditTeacher,
    handleViewTeacher,
    closeTeacherDetail,
    handleDeleteTeacher,
  };
}

export default useTeachers;
