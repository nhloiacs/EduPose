import { Modal } from '../../imports';

export default function CameraFormModal({
  isOpen,
  editingCameraId,
  cameraForm,
  setCameraForm,
  cameraFormError,
  cameraFormMessage,
  isSaving,
  onSubmit,
  onClose,
}) {
  if (!isOpen) return null;

  return (
    <Modal
      id="camera-form-modal-title"
      title={editingCameraId ? 'Ubah Kamera' : 'Tambah Kamera'}
      subtitle="Kelola endpoint kamera yang tersambung ke sistem."
      closeLabel="Tutup form kamera"
      onClose={onClose}
    >
      {cameraFormError && <p role="alert" style={{ color: '#b91c1c', marginBottom: '16px' }}>{cameraFormError}</p>}
      {cameraFormMessage && <p style={{ color: '#047857', marginBottom: '16px' }}>{cameraFormMessage}</p>}
      <form onSubmit={onSubmit}>
        <div className="profile-fields-grid">
          <div className="profile-field-group">
            <label>Nama Kamera</label>
            <input required value={cameraForm.name} onChange={(e) => setCameraForm({ ...cameraForm, name: e.target.value })} />
          </div>
          <div className="profile-field-group">
            <label>Endpoint</label>
            <input required value={cameraForm.endpoint} onChange={(e) => setCameraForm({ ...cameraForm, endpoint: e.target.value })} />
          </div>
          {editingCameraId && (
            <div className="profile-field-group">
              <label>Status</label>
              <select value={cameraForm.status} onChange={(e) => setCameraForm({ ...cameraForm, status: e.target.value })}>
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </select>
            </div>
          )}
        </div>
        <div className="modal-actions">
          <button disabled={isSaving} type="submit" className="btn-primary">
            {isSaving ? 'Menyimpan...' : editingCameraId ? 'Simpan Kamera' : 'Buat Kamera'}
          </button>
          <button type="button" className="modal-cancel-btn" onClick={onClose}>Batal</button>
        </div>
      </form>
    </Modal>
  );
}
