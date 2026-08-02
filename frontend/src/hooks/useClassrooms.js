import {
  useCallback,
  useEffect,
  useState,
  createClassroom,
  deleteClassroom,
  getClassroomDetail,
  getClassroomOptions,
  getClassroomStudents,
  listCollection,
  updateClassroom,
} from '../imports';

/**
 * Owns the classroom list, classroom options, classroom form modal and classroom detail page.
 */
export function useClassrooms({
  authToken,
  activeTab,
  setActiveTab,
  searchQuery,
  onClassroomRenamed,
  onClassroomDeleted,
  onOpenDetail,
}) {
  const [classroomPage, setClassroomPage] = useState(1);
  const [classroomList, setClassroomList] = useState([]);
  const [classroomMeta, setClassroomMeta] = useState({ total: 0, page: 1, size: 10 });
  const [classroomLoading, setClassroomLoading] = useState(false);
  const [classroomError, setClassroomError] = useState('');
  const [classroomForm, setClassroomForm] = useState({ name: '' });
  const [editingClassroomId, setEditingClassroomId] = useState(null);
  const [isClassroomFormOpen, setIsClassroomFormOpen] = useState(false);
  const [classroomOptions, setClassroomOptions] = useState([]);
  const [backendClassrooms, setBackendClassrooms] = useState([]);
  const [classroomDetail, setClassroomDetail] = useState(null);
  const [classroomDetailLoading, setClassroomDetailLoading] = useState(false);
  const [classroomDetailError, setClassroomDetailError] = useState('');

  useEffect(() => {
    if (!authToken) return;
    getClassroomOptions(authToken)
      .then((response) => setClassroomOptions(Array.isArray(response.data) ? response.data : []))
      .catch(() => setClassroomOptions([]));
  }, [authToken]);

  useEffect(() => {
    if (!authToken || activeTab !== 'classrooms') return undefined;
    let isActive = true;

    const loadClassrooms = async () => {
      setClassroomLoading(true);
      setClassroomError('');
      try {
        const response = await listCollection('/classrooms', authToken, {
          page: classroomPage,
          size: 10,
          search: searchQuery.trim(),
        });
        if (isActive) {
          setClassroomList(response.items);
          setClassroomMeta(response.meta);
        }
      } catch (error) {
        if (isActive) {
          setClassroomError(error instanceof Error ? error.message : 'Gagal mengambil daftar kelas.');
        }
      } finally {
        if (isActive) setClassroomLoading(false);
      }
    };

    loadClassrooms();
    return () => { isActive = false; };
  }, [activeTab, authToken, classroomPage, searchQuery]);

  const reloadClassroomOptions = useCallback(async () => {
    const response = await getClassroomOptions(authToken);
    const options = Array.isArray(response.data) ? response.data : [];
    setClassroomOptions(options);
    setBackendClassrooms(options);
  }, [authToken]);

  const resetClassroomForm = () => {
    setClassroomForm({ name: '' });
    setEditingClassroomId(null);
    setIsClassroomFormOpen(false);
  };

  const openClassroomCreateModal = () => {
    resetClassroomForm();
    setClassroomError('');
    setIsClassroomFormOpen(true);
  };

  const handleClassroomSubmit = async (event) => {
    event.preventDefault();
    setClassroomError('');
    try {
      const response = editingClassroomId
        ? await updateClassroom(editingClassroomId, classroomForm, authToken)
        : await createClassroom(classroomForm, authToken);
      const saved = response.data;

      setClassroomList((previous) => (editingClassroomId
        ? previous.map((item) => (String(item.id) === String(editingClassroomId) ? saved : item))
        : [saved, ...previous]));

      if (editingClassroomId) {
        onClassroomRenamed?.(editingClassroomId, saved.name);
      }

      setClassroomMeta((previous) => ({
        ...previous,
        total: editingClassroomId ? previous.total : previous.total + 1,
      }));

      resetClassroomForm();
      await reloadClassroomOptions();
    } catch (error) {
      setClassroomError(error instanceof Error ? error.message : 'Gagal menyimpan kelas.');
    }
  };

  const openClassroomDetail = async (classroom) => {
    setActiveTab('classroom-detail');
    setClassroomDetailError('');
    setClassroomDetailLoading(true);
    onOpenDetail?.(classroom);
    setClassroomDetail({ classroom, students: [] });

    try {
      const [detailResult, studentsResult] = await Promise.allSettled([
        getClassroomDetail(classroom.id, authToken),
        getClassroomStudents(classroom.id, authToken, { page: 1, size: 10 }),
      ]);

      const nextClassroom = detailResult.status === 'fulfilled' && detailResult.value.data
        ? detailResult.value.data
        : classroom;
      const nextStudents = studentsResult.status === 'fulfilled'
        ? (Array.isArray(studentsResult.value.items) ? studentsResult.value.items : [])
        : [];

      setClassroomDetail({ classroom: nextClassroom, students: nextStudents });

      const failedParts = [];
      if (detailResult.status === 'rejected') failedParts.push('detail');
      if (studentsResult.status === 'rejected') failedParts.push('siswa');
      if (failedParts.length > 0) {
        setClassroomDetailError(`Sebagian data classroom gagal dimuat: ${failedParts.join(', ')}.`);
      }
    } catch (error) {
      setClassroomDetailError(
        error instanceof Error ? error.message : 'Gagal mengambil detail classroom.',
      );
    } finally {
      setClassroomDetailLoading(false);
    }
  };

  const closeClassroomDetail = () => {
    setActiveTab('classrooms');
    setClassroomDetail(null);
  };

  const startEditClassroom = (classroom) => {
    setEditingClassroomId(classroom.id);
    setClassroomForm({ name: classroom.name || '' });
    setClassroomError('');
    setIsClassroomFormOpen(true);
  };

  const handleDeleteClassroom = async (classroom) => {
    if (!window.confirm(`Hapus kelas ${classroom.name}?`)) return;
    setClassroomError('');
    try {
      await deleteClassroom(classroom.id, authToken);
      setClassroomList((previous) => previous.filter((item) => String(item.id) !== String(classroom.id)));
      setClassroomMeta((previous) => ({ ...previous, total: Math.max(0, previous.total - 1) }));
      onClassroomDeleted?.(classroom.id);
      await reloadClassroomOptions();
    } catch (error) {
      setClassroomError(
        error instanceof Error
          ? error.message
          : 'Gagal menghapus kelas. Pastikan kelas tidak masih digunakan siswa.',
      );
    }
  };

  const filteredClassrooms = classroomList.filter((classroom) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return [classroom.name]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });

  const classroomFilterOptions = backendClassrooms.length > 0
    ? backendClassrooms.map((classroom) => classroom.name).filter(Boolean)
    : [];

  return {
    classroomPage,
    setClassroomPage,
    classroomList,
    filteredClassrooms,
    classroomMeta,
    classroomLoading,
    classroomError,
    classroomForm,
    setClassroomForm,
    editingClassroomId,
    isClassroomFormOpen,
    classroomOptions,
    backendClassrooms,
    setBackendClassrooms,
    classroomFilterOptions,
    classroomDetail,
    setClassroomDetail,
    classroomDetailLoading,
    classroomDetailError,
    reloadClassroomOptions,
    resetClassroomForm,
    openClassroomCreateModal,
    handleClassroomSubmit,
    openClassroomDetail,
    closeClassroomDetail,
    startEditClassroom,
    handleDeleteClassroom,
  };
}

export default useClassrooms;
