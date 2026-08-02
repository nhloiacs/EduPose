import {
  useCallback,
  useEffect,
  useState,
  createCamera,
  deleteCamera,
  getCameraDetail,
  getCameraList,
  getCameraOptions,
  updateCamera,
} from '../imports';

const EMPTY_CAMERA_FORM = { name: '', endpoint: '', status: 'active' };

const normalizeOption = (camera) => ({
  id: camera?.id ?? '',
  name: camera?.name ?? String(camera?.id ?? ''),
});

/**
 * Owns the camera list, camera options, camera form modal and camera detail modal.
 */
export function useCameras({ authToken, activeTab, searchQuery }) {
  const [cameraOptions, setCameraOptions] = useState([]);
  const [cameraList, setCameraList] = useState([]);
  const [cameraMeta, setCameraMeta] = useState({ total: 0, page: 1, size: 10 });
  const [cameraPage, setCameraPage] = useState(1);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [cameraForm, setCameraForm] = useState(EMPTY_CAMERA_FORM);
  const [editingCameraId, setEditingCameraId] = useState(null);
  const [isCameraFormOpen, setIsCameraFormOpen] = useState(false);
  const [cameraFormError, setCameraFormError] = useState('');
  const [cameraFormMessage, setCameraFormMessage] = useState('');
  const [cameraDetail, setCameraDetail] = useState(null);
  const [cameraDetailLoading, setCameraDetailLoading] = useState(false);
  const [cameraDetailError, setCameraDetailError] = useState('');
  const [isCameraDetailOpen, setIsCameraDetailOpen] = useState(false);

  const reloadCameraOptions = useCallback(async () => {
    if (!authToken) {
      setCameraOptions([]);
      return;
    }

    const [selectResult, listResult] = await Promise.allSettled([
      getCameraOptions(authToken),
      getCameraList(authToken, { page: 1, size: 100 }),
    ]);

    const selectOptions = selectResult.status === 'fulfilled' && Array.isArray(selectResult.value.data)
      ? selectResult.value.data.map(normalizeOption)
      : [];

    const listOptions = listResult.status === 'fulfilled' && Array.isArray(listResult.value.items)
      ? listResult.value.items.map(normalizeOption)
      : [];

    const mergedOptionsById = new Map();
    [...listOptions, ...selectOptions].forEach((option) => {
      if (!option.id) return;
      if (!mergedOptionsById.has(option.id)) {
        mergedOptionsById.set(option.id, option);
      }
    });

    setCameraOptions(Array.from(mergedOptionsById.values()));
  }, [authToken]);

  useEffect(() => {
    reloadCameraOptions();
  }, [reloadCameraOptions]);

  useEffect(() => {
    if (!authToken || activeTab !== 'cameras') return undefined;
    let isActive = true;

    const loadCameras = async () => {
      setCameraLoading(true);
      setCameraError('');
      try {
        const response = await getCameraList(authToken, {
          page: cameraPage,
          size: 10,
          search: searchQuery.trim(),
        });
        if (isActive) {
          setCameraList(response.items);
          setCameraMeta(response.meta);
        }
      } catch (error) {
        if (isActive) {
          setCameraError(error instanceof Error ? error.message : 'Gagal mengambil daftar kamera.');
        }
      } finally {
        if (isActive) setCameraLoading(false);
      }
    };

    loadCameras();
    return () => { isActive = false; };
  }, [activeTab, authToken, cameraPage, searchQuery]);

  const resetCameraForm = () => {
    setCameraForm(EMPTY_CAMERA_FORM);
    setEditingCameraId(null);
    setCameraFormError('');
    setCameraFormMessage('');
    setIsCameraFormOpen(false);
  };

  const openCameraForm = (camera = null) => {
    if (camera) {
      setEditingCameraId(camera.id);
      setCameraForm({
        name: camera.name || '',
        endpoint: camera.endpoint || '',
        status: camera.status || 'active',
      });
      setCameraFormMessage('');
      setCameraFormError('');
      setIsCameraFormOpen(true);
      return;
    }
    resetCameraForm();
    setIsCameraFormOpen(true);
  };

  const handleCameraSubmit = async (event) => {
    event.preventDefault();
    setCameraFormError('');
    setCameraFormMessage('');

    if (!cameraForm.name || !cameraForm.endpoint) {
      setCameraFormError('Nama kamera dan endpoint wajib diisi.');
      return;
    }

    try {
      const payload = { name: cameraForm.name, endpoint: cameraForm.endpoint };

      if (editingCameraId) {
        payload.status = cameraForm.status;
        const response = await updateCamera(editingCameraId, payload, authToken);
        setCameraFormMessage(response.message || 'Kamera berhasil diperbarui.');
      } else {
        const response = await createCamera(payload, authToken);
        setCameraFormMessage(response.message || 'Kamera berhasil dibuat.');
      }

      resetCameraForm();
      setCameraPage(1);
      const listResponse = await getCameraList(authToken, {
        page: 1,
        size: 10,
        search: searchQuery.trim(),
      });
      setCameraList(listResponse.items);
      setCameraMeta(listResponse.meta);
      await reloadCameraOptions();
    } catch (error) {
      setCameraFormError(error instanceof Error ? error.message : 'Gagal menyimpan data kamera.');
    }
  };

  const startEditCamera = async (camera) => {
    setCameraDetailLoading(true);
    setCameraDetailError('');
    try {
      const response = await getCameraDetail(camera.id, authToken);
      const data = response.data ?? camera;
      setCameraForm({
        name: data.name || camera.name || '',
        endpoint: data.endpoint || camera.endpoint || '',
        status: data.status || 'active',
      });
      setEditingCameraId(camera.id);
      setIsCameraFormOpen(true);
    } catch (error) {
      setCameraDetailError(error instanceof Error ? error.message : 'Gagal memuat detail kamera.');
    } finally {
      setCameraDetailLoading(false);
    }
  };

  const handleViewCameraDetail = async (camera) => {
    setCameraDetailLoading(true);
    setCameraDetailError('');
    setCameraDetail(null);
    setIsCameraDetailOpen(true);
    try {
      const response = await getCameraDetail(camera.id, authToken);
      setCameraDetail(response.data ?? camera);
    } catch (error) {
      setCameraDetailError(error instanceof Error ? error.message : 'Gagal memuat detail kamera.');
    } finally {
      setCameraDetailLoading(false);
    }
  };

  const closeCameraDetail = () => {
    setIsCameraDetailOpen(false);
    setCameraDetail(null);
    setCameraDetailError('');
  };

  const handleDeleteCamera = async (camera) => {
    if (!window.confirm(`Hapus kamera ${camera.name}?`)) return;
    setCameraError('');
    try {
      await deleteCamera(camera.id, authToken);
      setCameraList((previous) => previous.filter((item) => String(item.id) !== String(camera.id)));
      setCameraMeta((previous) => ({ ...previous, total: Math.max(0, previous.total - 1) }));
      await reloadCameraOptions();
    } catch (error) {
      setCameraError(error instanceof Error ? error.message : 'Gagal menghapus kamera.');
    }
  };

  return {
    cameraOptions,
    reloadCameraOptions,
    cameraList,
    cameraMeta,
    cameraPage,
    setCameraPage,
    cameraLoading,
    cameraError,
    cameraForm,
    setCameraForm,
    editingCameraId,
    isCameraFormOpen,
    cameraFormError,
    cameraFormMessage,
    cameraDetail,
    cameraDetailLoading,
    cameraDetailError,
    isCameraDetailOpen,
    resetCameraForm,
    openCameraForm,
    handleCameraSubmit,
    startEditCamera,
    handleViewCameraDetail,
    closeCameraDetail,
    handleDeleteCamera,
  };
}

export default useCameras;
