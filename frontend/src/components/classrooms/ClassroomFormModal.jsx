import { Modal } from '../../imports';

export default function ClassroomFormModal({
  isOpen,
  editingClassroomId,
  classroomForm,
  setClassroomForm,
  classroomError,
  onSubmit,
  onClose,
}) {
  if (!isOpen) return null;

  return (
    <Modal
      id="classroom-form-modal-title"
      title={editingClassroomId ? 'Ubah Classroom' : 'Tambah Classroom'}
      subtitle="Kelola data kelas langsung dari popup."
      closeLabel="Tutup form classroom"
      wide={false}
      onClose={onClose}
    >
      {classroomError && <p role="alert" style={{ color: '#b91c1c', marginBottom: '16px' }}>{classroomError}</p>}
      <form onSubmit={onSubmit}>
        <div className="profile-field-group">
          <label>Nama Kelas</label>
          <input
            required
            value={classroomForm.name}
            onChange={(event) => setClassroomForm({ name: event.target.value })}
          />
        </div>
        <div className="modal-actions">
          <button type="submit" className="btn-primary">
            {editingClassroomId ? 'Simpan Perubahan' : 'Buat Classroom'}
          </button>
          <button type="button" className="modal-cancel-btn" onClick={onClose}>Batal</button>
        </div>
      </form>
    </Modal>
  );
}
