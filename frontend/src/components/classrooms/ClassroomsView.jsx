import { Eye, PencilLine, Plus, Trash2, ActionButton, Pagination } from '../../imports';

export default function ClassroomsView({
  classrooms,
  classroomMeta,
  classroomPage,
  classroomLoading,
  classroomError,
  searchQuery,
  onPageChange,
  onCreate,
  onDetail,
  onEdit,
  onDelete,
}) {
  return (
    <div className="view-panel">
      <div className="table-header-section">
        <h2 className="card-title" style={{ fontSize: '1.2rem' }}>Daftar Classroom</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <span style={{ color: '#64748b' }}>{classroomMeta.total} kelas tersinkron</span>
          <button type="button" className="btn-primary" onClick={onCreate}>
            <Plus size={18} />
            <span>Tambah Classroom</span>
          </button>
        </div>
      </div>

      {classroomError && <p role="alert" style={{ color: '#b91c1c' }}>{classroomError}</p>}

      <div className="student-table-card">
        <table className="student-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Nama Kelas</th>
              <th style={{ textAlign: 'right' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {classroomLoading ? (
              <tr><td colSpan="3" style={{ textAlign: 'center', padding: '32px' }}>Memuat classroom...</td></tr>
            ) : classrooms.length > 0 ? (
              classrooms.map((classroom, index) => (
                <tr key={classroom.id}>
                  <td>{(classroomMeta.page - 1) * classroomMeta.size + index + 1}</td>
                  <td>{classroom.name}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <ActionButton variant="detail" icon={Eye} onClick={() => onDetail(classroom)}>Detail</ActionButton>
                      <ActionButton variant="edit" icon={PencilLine} onClick={() => onEdit(classroom)}>Ubah</ActionButton>
                      <ActionButton variant="delete" icon={Trash2} onClick={() => onDelete(classroom)}>Hapus</ActionButton>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3" style={{ textAlign: 'center', padding: '32px' }}>
                  {searchQuery.trim() ? 'Tidak ada classroom yang cocok dengan pencarian.' : 'Belum ada classroom.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={classroomPage} meta={classroomMeta} onPageChange={onPageChange} />
    </div>
  );
}
