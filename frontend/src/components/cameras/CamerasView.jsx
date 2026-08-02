import {
  Eye,
  PencilLine,
  Plus,
  Trash2,
  ActionButton,
  Pagination,
  formatDateTimeLabel,
} from '../../imports';

export default function CamerasView({
  cameraList,
  cameraMeta,
  cameraPage,
  cameraLoading,
  cameraError,
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
        <h2 className="card-title" style={{ fontSize: '1.2rem' }}>Daftar Kamera</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <span style={{ color: '#64748b' }}>{cameraMeta.total} kamera tersinkron</span>
          <button type="button" className="btn-primary" onClick={() => onCreate()}>
            <Plus size={18} />
            <span>Tambah Kamera</span>
          </button>
        </div>
      </div>

      {cameraError && <p role="alert" style={{ color: '#b91c1c' }}>{cameraError}</p>}

      <div className="student-table-card">
        <table className="student-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Nama Kamera</th>
              <th>Endpoint</th>
              <th>Status</th>
              <th>Last Ping</th>
              <th>Dibuat</th>
              <th style={{ textAlign: 'right' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {cameraLoading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px' }}>Memuat kamera...</td></tr>
            ) : cameraList.length > 0 ? (
              cameraList.map((camera, index) => (
                <tr key={camera.id}>
                  <td>{(cameraMeta.page - 1) * cameraMeta.size + index + 1}</td>
                  <td>{camera.name || '-'}</td>
                  <td>{camera.endpoint || '-'}</td>
                  <td>{camera.status || '-'}</td>
                  <td>{formatDateTimeLabel(camera.last_ping_at)}</td>
                  <td>{formatDateTimeLabel(camera.created_at)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      <ActionButton variant="detail" icon={Eye} onClick={() => onDetail(camera)}>Detail</ActionButton>
                      <ActionButton variant="edit" icon={PencilLine} onClick={() => onEdit(camera)}>Ubah</ActionButton>
                      <ActionButton variant="delete" icon={Trash2} onClick={() => onDelete(camera)}>Hapus</ActionButton>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                  {searchQuery.trim() ? 'Tidak ada kamera yang cocok dengan pencarian.' : 'Belum ada kamera.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={cameraPage} meta={cameraMeta} onPageChange={onPageChange} />
    </div>
  );
}
