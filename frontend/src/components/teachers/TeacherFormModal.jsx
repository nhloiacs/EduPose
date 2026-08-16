import { Modal } from '../../imports';

export default function TeacherFormModal({
  isOpen,
  editingTeacherId,
  teacherForm,
  setTeacherForm,
  teacherFormError,
  teacherFormMessage,
  isTeacherSaving,
  onSubmit,
  onClose,
}) {
  if (!isOpen) return null;

  return (
    <Modal
      id="teacher-form-modal-title"
      title={editingTeacherId ? 'Ubah Teacher' : 'Tambah Teacher'}
      subtitle="Lengkapi data guru di bawah ini."
      closeLabel="Tutup form teacher"
      onClose={onClose}
    >
      {teacherFormError && <p role="alert" style={{ color: '#b91c1c', marginBottom: '16px' }}>{teacherFormError}</p>}
      {teacherFormMessage && <p style={{ color: '#047857', marginBottom: '16px' }}>{teacherFormMessage}</p>}
      <form onSubmit={onSubmit}>
        <div className="profile-fields-grid">
          <div className="profile-field-group">
            <label>Nama</label>
            <input required value={teacherForm.name} onChange={(e) => setTeacherForm({ ...teacherForm, name: e.target.value })} />
          </div>
          <div className="profile-field-group">
            <label>Email</label>
            <input required type="email" value={teacherForm.email} onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })} />
          </div>
          <div className="profile-field-group">
            <label>NIP</label>
            <input required value={teacherForm.nip} onChange={(e) => setTeacherForm({ ...teacherForm, nip: e.target.value })} />
          </div>
          <div className="profile-field-group">
            <label>Role</label>
            <input required value={teacherForm.role} onChange={(e) => setTeacherForm({ ...teacherForm, role: e.target.value })} />
          </div>
          {!editingTeacherId && (
            <div className="profile-field-group">
              <label>Password</label>
              <input required minLength="1" type="password" value={teacherForm.password} onChange={(e) => setTeacherForm({ ...teacherForm, password: e.target.value })} />
            </div>
          )}
          <div className="profile-field-group">
            <label>Foto {editingTeacherId ? '(opsional)' : ''}</label>
            <input
              required={!editingTeacherId}
              type="file"
              accept="image/*"
              onChange={(e) => setTeacherForm({ ...teacherForm, file: e.target.files?.[0] || null })}
            />
          </div>
        </div>
        <div className="modal-actions">
          <button disabled={isTeacherSaving} type="submit" className="btn-primary">
            {isTeacherSaving ? 'Menyimpan...' : editingTeacherId ? 'Simpan Perubahan' : 'Buat Teacher'}
          </button>
          <button type="button" className="modal-cancel-btn" onClick={onClose}>Batal</button>
        </div>
      </form>
    </Modal>
  );
}
