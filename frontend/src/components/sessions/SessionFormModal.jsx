import { Modal } from '../../imports';

export default function SessionFormModal({
  isOpen,
  sessionForm,
  setSessionForm,
  sessionFormError,
  sessionFormMessage,
  isSessionSaving,
  classroomOptions,
  cameraOptions,
  onSubmit,
  onClose,
}) {
  if (!isOpen) return null;

  return (
    <Modal
      id="session-form-modal-title"
      title="Buat Sesi Ajar"
      subtitle="Teacher hanya dapat membuat sesi ajar yang terhubung ke kelas dan kamera."
      closeLabel="Tutup form sesi"
      onClose={onClose}
    >
      {sessionFormError && <p role="alert" style={{ color: '#b91c1c', marginBottom: '16px' }}>{sessionFormError}</p>}
      {sessionFormMessage && <p style={{ color: '#047857', marginBottom: '16px' }}>{sessionFormMessage}</p>}
      <form onSubmit={onSubmit}>
        <div className="profile-fields-grid">
          <div className="profile-field-group">
            <label>Kelas</label>
            <select
              required
              value={sessionForm.classroom_id}
              onChange={(event) => setSessionForm({ ...sessionForm, classroom_id: event.target.value })}
            >
              <option value="">Pilih kelas</option>
              {classroomOptions.map((classroom) => (
                <option key={classroom.id} value={classroom.id}>{classroom.name}</option>
              ))}
            </select>
          </div>
          <div className="profile-field-group">
            <label>Kamera</label>
            <select
              required
              value={sessionForm.camera_id}
              onChange={(event) => setSessionForm({ ...sessionForm, camera_id: event.target.value })}
            >
              <option value="">Pilih kamera</option>
              {cameraOptions.map((camera) => (
                <option key={camera.id} value={camera.id}>{camera.name || camera.id}</option>
              ))}
            </select>
          </div>
          <div className="profile-field-group" style={{ gridColumn: 'span 2' }}>
            <label>Topik / Subject</label>
            <input
              value={sessionForm.subject}
              onChange={(event) => setSessionForm({ ...sessionForm, subject: event.target.value })}
              placeholder="Contoh: Matematika, Fisika, etc."
            />
          </div>
        </div>
        <div className="modal-actions">
          <button disabled={isSessionSaving} type="submit" className="btn-primary">
            {isSessionSaving ? 'Menyimpan...' : 'Buat Sesi'}
          </button>
          <button type="button" className="modal-cancel-btn" onClick={onClose}>Batal</button>
        </div>
      </form>
    </Modal>
  );
}
