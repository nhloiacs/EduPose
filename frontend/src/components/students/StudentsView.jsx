import {
  Eye,
  PencilLine,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
  ActionButton,
} from '../../imports';

export default function StudentsView({
  students,
  studentMeta,
  studentPage,
  studentTotalPages,
  studentLoading,
  studentError,
  classroomFilterOptions,
  classFilter,
  onClassFilterChange,
  statusFilter,
  onStatusFilterChange,
  searchQuery,
  onPageChange,
  onCreate,
  onDetail,
  onEdit,
  onDelete,
}) {
  const hasFilter = Boolean(searchQuery) || classFilter !== 'All' || statusFilter !== 'All';

  return (
    <div className="view-panel">
      <div className="table-header-section">
        <h2 className="card-title" style={{ fontSize: '1.2rem' }}>
          Daftar Siswa dan Status Atensi Real-Time
        </h2>

        <div className="table-filter-bar">
          <select
            className="filter-select"
            value={classFilter}
            onChange={(event) => onClassFilterChange(event.target.value)}
          >
            <option value="All">Semua Kelas</option>
            {classroomFilterOptions.map((classroomName) => (
              <option key={classroomName} value={classroomName}>{classroomName}</option>
            ))}
          </select>

          <select
            className="filter-select"
            value={statusFilter}
            onChange={(event) => onStatusFilterChange(event.target.value)}
          >
            <option value="All">Semua Status</option>
            <option value="Aktif">Aktif</option>
            <option value="Tidak Aktif">Tidak Aktif</option>
          </select>
        </div>
      </div>

      {studentError && (
        <p role="alert" style={{ color: '#b91c1c', marginBottom: '12px' }}>{studentError}</p>
      )}

      <div className="student-table-card">
        <table className="student-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Nama</th>
              <th>Kelas</th>
              <th>Atensi</th>
              <th>Emosi</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Tren</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {studentLoading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                  Memuat data siswa dari backend...
                </td>
              </tr>
            ) : students.length > 0 ? (
              students.map((student, index) => {
                let attColor = 'success';
                if (student.attention < 50) attColor = 'danger';
                else if (student.attention < 70) attColor = 'warning';

                const rowNumber = ((studentMeta.page - 1) * studentMeta.size) + index + 1;

                return (
                  <tr key={student.id}>
                    <td style={{ color: '#64748b', fontWeight: 600 }}>{rowNumber}</td>
                    <td className="table-student-name">{student.name}</td>
                    <td>{student.class}</td>
                    <td>
                      <div className="table-progress-bar">
                        <div className="table-bar-container">
                          <div className={`table-bar ${attColor}`} style={{ width: `${student.attention}%` }} />
                        </div>
                        <span style={{ fontWeight: 600 }}>{student.attention}%</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge badge-${String(student.emotion || '').toLowerCase()}`}>
                        {student.emotion}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-status ${student.status === 'Aktif' ? 'badge-aktif' : 'badge-tidak-aktif'}`}>
                        {student.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="sparkline-icon">
                        {student.trend === 'up'
                          ? <TrendingUp size={16} className="up" />
                          : <TrendingDown size={16} className="down" />}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <ActionButton variant="detail" icon={Eye} onClick={() => onDetail(student.id)}>Detail</ActionButton>
                        <ActionButton variant="edit" icon={PencilLine} onClick={() => onEdit(student)}>Ubah</ActionButton>
                        <ActionButton variant="delete" icon={Trash2} onClick={() => onDelete(student)}>Hapus</ActionButton>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                  {hasFilter
                    ? 'Tidak ada siswa yang cocok dengan filter pencarian.'
                    : 'Belum ada data siswa dari backend.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination-row" style={{ marginTop: '16px' }}>
        <span className="pagination-label">
          Halaman {studentMeta.page} dari {studentTotalPages} — {studentMeta.total} siswa
        </span>
        <div className="pagination-actions">
          <button type="button" className="pagination-button" disabled={studentPage <= 1} onClick={() => onPageChange(studentPage - 1)}>Sebelumnya</button>
          <button type="button" className="pagination-button" disabled={studentPage >= studentTotalPages} onClick={() => onPageChange(studentPage + 1)}>Berikutnya</button>
          <button type="button" className="btn-primary" onClick={onCreate}>
            <Plus size={18} />
            <span>Tambah Siswa</span>
          </button>
        </div>
      </div>
    </div>
  );
}
