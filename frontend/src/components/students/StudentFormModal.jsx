import { Modal } from '../../imports';

export default function StudentFormModal({
  isOpen,
  editingStudentId,
  studentForm,
  setStudentForm,
  studentFormMessage,
  classroomOptions,
  onSubmit,
  onClose,
}) {
  if (!isOpen) return null;

  return (
    <Modal
      id="student-edit-modal-title"
      title={editingStudentId ? 'Ubah Siswa' : 'Tambah Siswa'}
      subtitle={editingStudentId
        ? 'Perbarui data siswa tanpa menambah panel di bawah'
        : 'Isi data siswa baru tanpa meninggalkan halaman'}
      closeLabel="Tutup editor siswa"
      onClose={onClose}
    >
      {studentFormMessage && <p style={{ color: '#047857', marginBottom: '16px' }}>{studentFormMessage}</p>}
      <form onSubmit={onSubmit}>
        <div className="profile-fields-grid">
          <div className="profile-field-group">
            <label>Nama</label>
            <input
              required
              value={studentForm.name}
              onChange={(event) => setStudentForm({ ...studentForm, name: event.target.value })}
            />
          </div>
          <div className="profile-field-group">
            <label>NIS</label>
            <input
              required
              value={studentForm.nis}
              onChange={(event) => setStudentForm({ ...studentForm, nis: event.target.value })}
            />
          </div>
          <div className="profile-field-group">
            <label>Kelas</label>
            <select
              required
              value={studentForm.classroom_id}
              onChange={(event) => setStudentForm({ ...studentForm, classroom_id: event.target.value })}
            >
              <option value="">Pilih kelas</option>
              {classroomOptions.map((classroom) => (
                <option key={classroom.id} value={classroom.id}>{classroom.name}</option>
              ))}
            </select>
          </div>
          <div className="profile-field-group">
            <label>Foto {editingStudentId ? '(opsional)' : ''}</label>
            <input
              required={!editingStudentId}
              type="file"
              accept="image/*"
              onChange={(event) => setStudentForm({ ...studentForm, file: event.target.files?.[0] || null })}
            />
          </div>
        </div>
        <div className="modal-actions">
          <button type="submit" className="btn-primary">
            {editingStudentId ? 'Simpan Perubahan' : 'Buat Siswa'}
          </button>
          <button type="button" className="modal-cancel-btn" onClick={onClose}>Batal</button>
        </div>
      </form>
    </Modal>
  );
}
