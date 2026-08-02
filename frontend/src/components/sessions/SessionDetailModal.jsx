import {
  Save,
  Trash2,
  ActionButton,
  Modal,
  formatDateTimeLabel,
  formatMetricValue,
} from '../../imports';

const DetailRow = ({ label, children }) => (
  <div className="modal-detail-row">
    <span className="modal-detail-label">{label}</span>
    <span className="modal-detail-value">{children}</span>
  </div>
);

const MetricBox = ({ label, value }) => (
  <div className="metric-card">
    <div className="metric-label">{label}</div>
    <div className="metric-value">{value}</div>
  </div>
);

export default function SessionDetailModal({
  isOpen,
  sessionDetail,
  sessionDetailLoading,
  sessionDetailError,
  isTeacherUser,
  sessionActionState,
  registerStudentId,
  setRegisterStudentId,
  registerStudentOptions,
  onRegisterStudentPose,
  onStartEvaluation,
  onEndEvaluation,
  onEndSession,
  onClose,
}) {
  if (!isOpen) return null;

  const metrics = sessionDetail?.metrics_summary ?? {};
  const isBusy = sessionActionState === 'loading';

  return (
    <Modal
      id="session-detail-modal-title"
      title="Detail Sesi"
      subtitle="Informasi lengkap sesi dan ringkasan metrik."
      closeLabel="Tutup detail sesi"
      onClose={onClose}
    >
      {sessionDetailLoading && (
        <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '16px', marginBottom: '16px' }}>
          Memuat detail sesi...
        </div>
      )}

      {sessionDetailError && (
        <p role="alert" style={{ color: '#b91c1c', marginBottom: '16px' }}>{sessionDetailError}</p>
      )}

      {sessionDetail && (
        <div style={{ display: 'grid', gap: '20px' }}>
          {isTeacherUser && (
            <div style={{ display: 'grid', gap: 8 }}>
              {registerStudentOptions.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <label htmlFor="register-student-select" style={{ fontWeight: 600, color: '#1e1b4b' }}>
                    Pilih Siswa untuk Register Pose
                  </label>
                  <select
                    id="register-student-select"
                    value={registerStudentId}
                    onChange={(event) => setRegisterStudentId(event.target.value)}
                    style={{ minWidth: '220px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff' }}
                  >
                    <option value="">Pilih siswa...</option>
                    {registerStudentOptions.map((option) => (
                      <option key={option.id} value={option.id}>{option.label}</option>
                    ))}
                  </select>
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <ActionButton variant="primary" icon={Save} onClick={() => onRegisterStudentPose(sessionDetail.id)} disabled={isBusy}>Register Student Pose</ActionButton>
                <ActionButton variant="primary" icon={Save} onClick={() => onStartEvaluation(sessionDetail.id)} disabled={isBusy}>Start Evaluation</ActionButton>
                <ActionButton variant="secondary" icon={Save} onClick={() => onEndEvaluation(sessionDetail.id)} disabled={isBusy}>End Evaluation</ActionButton>
                <ActionButton variant="danger" icon={Trash2} onClick={() => onEndSession(sessionDetail.id)} disabled={isBusy}>End Session</ActionButton>
              </div>
            </div>
          )}

          <div className="modal-detail-card">
            <DetailRow label="ID Sesi">{sessionDetail.id || '-'}</DetailRow>
            <DetailRow label="Nama Kelas">{sessionDetail.classroom_name || '-'}</DetailRow>
            <DetailRow label="ID Kelas">{sessionDetail.classroom_id || '-'}</DetailRow>
            <DetailRow label="Nama Guru">{sessionDetail.teacher_name || '-'}</DetailRow>
            <DetailRow label="ID Guru">{sessionDetail.teacher_id || '-'}</DetailRow>
            <DetailRow label="Nama Kamera">{sessionDetail.camera_name || '-'}</DetailRow>
            <DetailRow label="ID Kamera">{sessionDetail.camera_id || '-'}</DetailRow>
            <DetailRow label="Subject">{sessionDetail.subject || '-'}</DetailRow>
            <DetailRow label="Mulai">{formatDateTimeLabel(sessionDetail.start_time)}</DetailRow>
            <DetailRow label="Selesai">{formatDateTimeLabel(sessionDetail.end_time)}</DetailRow>
            <DetailRow label="Status">{sessionDetail.status || '-'}</DetailRow>
          </div>

          <div className="dashboard-card" style={{ padding: '20px' }}>
            <div className="card-header" style={{ marginBottom: '18px' }}>
              <div>
                <h3 className="card-title">Ringkasan Metrik Sesi</h3>
                <p className="card-subtitle">Angka fokus, siswa aktif, dan penghitung kehadiran.</p>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px' }}>
              <MetricBox label="Rata-rata Fokus" value={`${formatMetricValue(metrics.avg_focus_percentage)}%`} />
              <MetricBox label="Rata-rata Siswa Aktif" value={formatMetricValue(metrics.avg_active_students)} />
              <MetricBox label="Total Pakai HP" value={formatMetricValue(metrics.total_using_phone)} />
              <MetricBox label="Total Angkat Tangan" value={formatMetricValue(metrics.total_raised_hand)} />
            </div>
          </div>

          <div className="modal-detail-card">
            <DetailRow label="Hadir">{sessionDetail.present_count ?? '-'}</DetailRow>
            <DetailRow label="Absen">{sessionDetail.absent_count ?? '-'}</DetailRow>
          </div>
        </div>
      )}
    </Modal>
  );
}
