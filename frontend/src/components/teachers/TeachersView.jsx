import { Eye, PencilLine, Plus, Trash2, ActionButton, Avatar } from '../../imports';
import '../../styles/profileCard.css';

export default function TeachersView({
  teachers,
  isPrincipalUser,
  searchQuery,
  onCreate,
  onView,
  onEdit,
  onDelete,
}) {
  return (
    <div className="view-panel">
      <div className="table-header-section" style={{ marginBottom: '18px' }}>
        <h2 className="card-title" style={{ fontSize: '1.2rem' }}>Daftar Teacher</h2>
        {isPrincipalUser && (
          <button type="button" className="btn-primary" onClick={onCreate}>
            <Plus size={18} />
            <span>Tambah Teacher</span>
          </button>
        )}
      </div>

      <div className="student-table-card">
        {teachers.length > 0 ? teachers.map((teacher, index) => (
          <div
            key={teacher.id}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span className="list-number-badge">{index + 1}</span>
              <Avatar name={teacher.name} photo={teacher.photo_filepath} size={38} />
              <span>{teacher.name} — {teacher.nip}</span>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <ActionButton variant="detail" icon={Eye} onClick={() => onView(teacher.id)}>Lihat</ActionButton>
              {isPrincipalUser && (
                <>
                  <ActionButton variant="edit" icon={PencilLine} onClick={() => onEdit(teacher)}>Ubah</ActionButton>
                  <ActionButton variant="delete" icon={Trash2} onClick={() => onDelete(teacher)}>Hapus</ActionButton>
                </>
              )}
            </div>
          </div>
        )) : (
          <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
            {searchQuery.trim() ? 'Tidak ada teacher yang cocok dengan pencarian.' : 'Belum ada teacher.'}
          </div>
        )}
      </div>
    </div>
  );
}
