import { Modal, StudentSessionsHistoryDisplay, resolveAssetUrl } from '../../imports';

const DetailRow = ({ label, children }) => (
  <div className="modal-detail-row">
    <span className="modal-detail-label">{label}</span>
    <span className="modal-detail-value">{children}</span>
  </div>
);

export default function StudentDetailModal({ studentDetail, authToken, onClose }) {
  if (!studentDetail) return null;

  const photoUrl = resolveAssetUrl(studentDetail.photo_filepath);
  const metrics = studentDetail.metrics_summary ?? {};

  return (
    <Modal
      id="student-detail-modal-title"
      title="Detail Siswa"
      subtitle="Informasi lengkap siswa dan riwayat sesi"
      closeLabel="Tutup detail siswa"
      onClose={onClose}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', padding: '20px', minHeight: '500px' }}>
        <div className="modal-detail-card">
          <DetailRow label="ID">{studentDetail.id || '-'}</DetailRow>
          <DetailRow label="Nama">{studentDetail.name}</DetailRow>
          <DetailRow label="Foto">
            {photoUrl
              ? <img src={photoUrl} alt={studentDetail.name || 'foto siswa'} style={{ height: 80, borderRadius: 8 }} />
              : '-'}
          </DetailRow>
          <DetailRow label="NIS">{studentDetail.nis || '-'}</DetailRow>
          <DetailRow label="Kelas">{studentDetail.classroom_name || '-'}</DetailRow>
          <DetailRow label="Rata-rata Fokus">{((metrics.avg_focus_score ?? 0) * 100).toFixed(1)}%</DetailRow>
          <DetailRow label="Rata-rata Terdistraksi">{((metrics.avg_distracted_score ?? 0) * 100).toFixed(1)}%</DetailRow>
          <DetailRow label="Total Angkat Tangan">{metrics.total_raised_hand_count ?? 0}</DetailRow>
        </div>
        <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '20px', maxHeight: '500px', overflowY: 'auto' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>Riwayat Sesi</h4>
          <StudentSessionsHistoryDisplay studentId={studentDetail.id} authToken={authToken} />
        </div>
      </div>
    </Modal>
  );
}
