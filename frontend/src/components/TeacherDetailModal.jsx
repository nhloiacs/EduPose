import { XCircle } from 'lucide-react';
import { API_BASE_URL } from '../lib/backendApi';

const formatDate = (timestamp) => {
  if (!timestamp) return '-';
  const parsedTime = new Date(timestamp);
  if (Number.isNaN(parsedTime.getTime())) return '-';
  return parsedTime.toLocaleDateString('id-ID', {
    dateStyle: 'medium',
  });
};

const formatTime = (timestamp) => {
  if (!timestamp) return '-';
  const parsedTime = new Date(timestamp);
  if (Number.isNaN(parsedTime.getTime())) return '-';
  return parsedTime.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const buildImageUrl = (photo_filepath) => {
  if (!photo_filepath) return null;
  if (typeof photo_filepath === 'string' && (photo_filepath.startsWith('http://') || photo_filepath.startsWith('https://'))) {
    return photo_filepath;
  }
  return `${API_BASE_URL}${photo_filepath.startsWith('/') ? '' : '/'}${photo_filepath}`;
};

export default function TeacherDetailModal({
  teacherDetailModal,
  teacherDetailLoading,
  teacherDetailData,
  teacherErrorMsg,
  teacherSessions,
  teacherSessionsError,
  onClose,
}) {
  if (!teacherDetailModal) return null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal-card modal-card--wide" role="dialog" aria-modal="true" aria-labelledby="teacher-detail-modal-title" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 id="teacher-detail-modal-title" className="modal-title">Detail Guru</h3>
            <p className="modal-subtitle">Informasi lengkap guru dan riwayat sesi</p>
          </div>
          <button type="button" className="modal-close" aria-label="Tutup detail guru" onClick={onClose}>
            <XCircle size={20} />
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', padding: '20px', minHeight: '500px' }}>
          <div className="modal-detail-card">
            {teacherDetailLoading ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Memuat data guru...</div>
            ) : teacherDetailData ? (
              <>
                <div className="modal-detail-row"><span className="modal-detail-label">ID</span><span className="modal-detail-value">{teacherDetailData.id || '-'}</span></div>
                <div className="modal-detail-row"><span className="modal-detail-label">Nama</span><span className="modal-detail-value">{teacherDetailData.name}</span></div>
                <div className="modal-detail-row"><span className="modal-detail-label">Email</span><span className="modal-detail-value">{teacherDetailData.email || '-'}</span></div>
                <div className="modal-detail-row"><span className="modal-detail-label">Foto</span><span className="modal-detail-value">{teacherDetailData.photo_filepath ? (() => { const src = buildImageUrl(teacherDetailData.photo_filepath); return <img src={src} alt={teacherDetailData.name || 'foto guru'} style={{ height: 80, borderRadius: 8 }} />; })() : '-'}</span></div>
                <div className="modal-detail-row"><span className="modal-detail-label">NIP</span><span className="modal-detail-value">{teacherDetailData.nip || '-'}</span></div>
                <div className="modal-detail-row"><span className="modal-detail-label">Role</span><span className="modal-detail-value">{teacherDetailData.role || '-'}</span></div>
                <div className="modal-detail-row"><span className="modal-detail-label">Status</span><span className="modal-detail-value">{teacherDetailData.is_active ? 'Aktif' : 'Tidak Aktif'}</span></div>
              </>
            ) : (
              <div style={{ padding: '12px', color: '#64748b' }}>{teacherErrorMsg || 'Detail guru tidak tersedia.'}</div>
            )}
          </div>

          <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '20px', maxHeight: '500px', overflowY: 'auto' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>Riwayat Sesi</h4>
            {teacherSessions.length > 0 ? (
              <div style={{ display: 'grid', gap: '10px' }}>
                {teacherSessions.map((s) => (
                  <div key={s.session_id} style={{ padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', backgroundColor: '#f8fafc' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#1e293b', marginBottom: '4px' }}>{s.subject || 'Tanpa Judul'}</div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '6px' }}>📚 {s.classroom_name || '-'}</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>⏰ {formatDate(s.start_time)} {formatTime(s.start_time)}</div>
                    {s.metrics && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #e2e8f0' }}>
                        <div style={{ textAlign: 'center', fontSize: '0.75rem' }}>
                          <div style={{ color: '#3b82f6', fontWeight: 600 }}>{Math.round(s.metrics.focus_percentage)}%</div>
                          <div style={{ color: '#64748b' }}>Fokus</div>
                        </div>
                        <div style={{ textAlign: 'center', fontSize: '0.75rem' }}>
                          <div style={{ color: '#10b981', fontWeight: 600 }}>{s.metrics.raised_hand_count}</div>
                          <div style={{ color: '#64748b' }}>Angkat Tangan</div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : teacherSessionsError ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#991b1b', backgroundColor: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '6px' }}>
                <p style={{ margin: 0, fontWeight: 600 }}>Gagal memuat riwayat sesi guru</p>
                <p style={{ margin: '8px 0 0', fontSize: '0.9rem', color: '#7f1d1d' }}>{teacherSessionsError}</p>
              </div>
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>Belum ada sesi untuk guru ini.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
