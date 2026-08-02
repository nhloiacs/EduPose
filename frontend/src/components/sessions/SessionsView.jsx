import { Eye, Plus, ActionButton, Pagination, formatDateTimeLabel } from '../../imports';

export default function SessionsView({
  sessions,
  sessionMeta,
  sessionPage,
  sessionLoading,
  sessionError,
  searchQuery,
  canCreateSession,
  onPageChange,
  onCreate,
  onDetail,
}) {
  return (
    <div className="view-panel">
      <div className="table-header-section">
        <h2 className="card-title" style={{ fontSize: '1.2rem' }}>Daftar Sesi</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <span style={{ color: '#64748b' }}>{sessionMeta.total} sesi tersinkron</span>
          {canCreateSession && (
            <button type="button" className="btn-primary" onClick={onCreate}>
              <Plus size={18} />
              <span>Buat Sesi</span>
            </button>
          )}
        </div>
      </div>

      {sessionError && <p role="alert" style={{ color: '#b91c1c' }}>{sessionError}</p>}

      <div className="student-table-card">
        <table className="student-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Subject</th>
              <th>Kelas</th>
              <th>Guru</th>
              <th>Kamera</th>
              <th>Mulai</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {sessionLoading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '32px' }}>Memuat sesi...</td></tr>
            ) : sessions.length > 0 ? (
              sessions.map((session, index) => (
                <tr key={session.id}>
                  <td>{(sessionMeta.page - 1) * sessionMeta.size + index + 1}</td>
                  <td>{session.subject || 'Tanpa judul'}</td>
                  <td>{session.classroom_name || '-'}</td>
                  <td>{session.teacher_name || '-'}</td>
                  <td>{session.camera_name || '-'}</td>
                  <td>{formatDateTimeLabel(session.start_time)}</td>
                  <td>
                    <span className={`badge badge-status ${session.status === 'ended' ? 'badge-tidak-aktif' : 'badge-aktif'}`}>
                      {session.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <ActionButton variant="detail" icon={Eye} onClick={() => onDetail(session.id)}>Detail</ActionButton>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                  {searchQuery.trim() ? 'Tidak ada sesi yang cocok dengan pencarian.' : 'Belum ada sesi.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={sessionPage} meta={sessionMeta} onPageChange={onPageChange} />
    </div>
  );
}
