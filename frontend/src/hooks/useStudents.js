import {
  useEffect,
  useState,
  createStudent,
  deleteStudent,
  getClassroomSessionDetail,
  getClassroomStudents,
  getStudentDetail,
  getStudentEdit,
  listCollection,
  mergeStudentsFromBackend,
  updateStudent,
} from '../imports';

const EMPTY_STUDENT_FORM = { name: '', nis: '', classroom_id: '', file: null };

/**
 * Owns the paginated student list, student form modal and student detail modal.
 */
export function useStudents({ authToken, activeTab, searchQuery, currentUser }) {
  const [studentPage, setStudentPage] = useState(1);
  const [studentList, setStudentList] = useState([]);
  const [studentMeta, setStudentMeta] = useState({ total: 0, page: 1, size: 10 });
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentError, setStudentError] = useState('');
  const [studentDetail, setStudentDetail] = useState(null);
  const [studentForm, setStudentForm] = useState(EMPTY_STUDENT_FORM);
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [isStudentEditorOpen, setIsStudentEditorOpen] = useState(false);
  const [studentFormMessage, setStudentFormMessage] = useState('');

  useEffect(() => {
    if (!authToken || activeTab !== 'students') return undefined;
    let isActive = true;

    const timer = setTimeout(async () => {
      setStudentLoading(true);
      setStudentError('');
      try {
        if (currentUser?.role === 'principal') {
          const response = await listCollection('/students', authToken, {
            page: studentPage,
            size: 10,
            search: searchQuery.trim(),
          });
          if (isActive) {
            setStudentList(mergeStudentsFromBackend(response.items));
            setStudentMeta(response.meta);
          }
        } else {
          // Untuk teacher: tentukan kelas yang benar-benar diajar melalui daftar sesi,
          // lalu ambil siswa dari setiap kelas tersebut.
          const sessionsList = await listCollection('/classroom-sessions', authToken, { page: 1, size: 100 });
          const sessionItems = Array.isArray(sessionsList.items) ? sessionsList.items : [];

          const detailResults = await Promise.all(
            sessionItems.map((session) => getClassroomSessionDetail(session.id, authToken).catch(() => null)),
          );

          const classroomIdSet = new Set();
          detailResults.forEach((result) => {
            if (result?.data?.classroom_id) {
              classroomIdSet.add(String(result.data.classroom_id));
            }
          });

          const classroomIds = Array.from(classroomIdSet);

          if (classroomIds.length === 0) {
            if (isActive) {
              setStudentList([]);
              setStudentMeta({ total: 0, page: 1, size: 10 });
            }
          } else {
            const studentsResults = await Promise.all(
              classroomIds.map((classroomId) => getClassroomStudents(classroomId, authToken, {
                page: studentPage,
                size: 10,
                search: searchQuery.trim(),
              }).catch(() => null)),
            );

            const merged = [];
            let totalCount = 0;
            studentsResults.forEach((result) => {
              if (result && Array.isArray(result.items)) {
                merged.push(...result.items);
                totalCount += Number(result.meta?.total ?? result.items.length ?? 0);
              }
            });

            const seen = new Set();
            const uniqueStudents = merged.filter((student) => {
              const studentId = student.id ?? student.student_id ?? null;
              if (!studentId) return false;
              if (seen.has(String(studentId))) return false;
              seen.add(String(studentId));
              return true;
            });

            if (isActive) {
              setStudentList(mergeStudentsFromBackend(uniqueStudents));
              setStudentMeta({ total: totalCount, page: studentPage, size: 10 });
            }
          }
        }
      } catch (error) {
        if (isActive) {
          setStudentError(error instanceof Error ? error.message : 'Gagal mengambil daftar siswa.');
        }
      } finally {
        if (isActive) setStudentLoading(false);
      }
    }, 300);

    return () => { isActive = false; clearTimeout(timer); };
  }, [activeTab, authToken, searchQuery, studentPage, currentUser?.role]);

  const resetStudentForm = () => {
    setStudentForm(EMPTY_STUDENT_FORM);
    setEditingStudentId(null);
    setIsStudentEditorOpen(false);
  };

  const openStudentCreateModal = () => {
    setStudentForm(EMPTY_STUDENT_FORM);
    setEditingStudentId(null);
    setStudentDetail(null);
    setStudentError('');
    setStudentFormMessage('');
    setIsStudentEditorOpen(true);
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

      const listResponse = await listCollection('/students', authToken, {
        page: 1,
        size: 10,
        search: searchQuery.trim(),
      });
      setStudentList(mergeStudentsFromBackend(listResponse.items));
      setStudentMeta(listResponse.meta);
    } catch (error) {
      setStudentError(error instanceof Error ? error.message : 'Gagal menyimpan data siswa.');
    }
  };

  const startEditStudent = (student) => {
    setEditingStudentId(student.id);
    setIsStudentEditorOpen(true);
    setStudentDetail(null);
    setStudentError('');
    setStudentFormMessage('');

    (async () => {
      try {
        const response = await getStudentEdit(student.id, authToken);
        const data = response.data ?? {};
        setStudentForm({
          name: data.name || student.name || '',
          nis: data.nis || student.nis || '',
          classroom_id: data.classroom_id || student.classroom_id || '',
          file: null,
        });
      } catch {
        setStudentForm({
          name: student.name || '',
          nis: student.nis || '',
          classroom_id: student.classroom_id || '',
          file: null,
        });
      }
    })();
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

  /** Dipakai saat sebuah kelas diubah namanya. */
  const applyClassroomRename = (classroomId, classroomName) => {
    setStudentList((previous) => previous.map((student) => (
      String(student.classroom_id) === String(classroomId)
        ? { ...student, class: classroomName }
        : student
    )));
  };

  /** Dipakai saat sebuah kelas dihapus agar form siswa tidak menyimpan kelas hantu. */
  const clearClassroomFromForm = (classroomId) => {
    setStudentForm((previous) => (previous.classroom_id === classroomId
      ? { ...previous, classroom_id: '' }
      : previous));
  };

  const studentTotalPages = Math.max(1, Math.ceil(studentMeta.total / studentMeta.size));

  return {
    studentPage,
    setStudentPage,
    studentList,
    studentMeta,
    studentTotalPages,
    studentLoading,
    studentError,
    studentDetail,
    setStudentDetail,
    studentForm,
    setStudentForm,
    editingStudentId,
    isStudentEditorOpen,
    studentFormMessage,
    resetStudentForm,
    openStudentCreateModal,
    handleStudentSubmit,
    startEditStudent,
    handleStudentDetail,
    handleDeleteStudent,
    applyClassroomRename,
    clearClassroomFromForm,
  };
}

export default useStudents;
