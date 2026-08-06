import {
  Play,
  Square,
  Trash2,
  UserCheck,
  ActionButton,
  Modal,
  attendanceLabel,
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

const MESSAGE_STYLE = {
  success: { background: '#ecfdf5', border: '#a7f3d0', color: '#047857' },
  error: { background: '#fef2f2', border: '#fca5a5', color: '#b91c1c' },
  info: { background: '#eef2ff', border: '#c7d2fe', color: '#4338ca' },
};

export default function SessionDetailModal({
  isOpen,
  sessionDetail,
  sessionDetailLoading,
  sessionDetailError,
  isTeacherUser,
  sessionActionState,
  sessionActionMessage,
  isEvaluating,
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
  const isBusy = sessionActionState !== 'idle';
  const isSessionActive = String(sessionDetail?.status || '').toUpperCase() === 'ONGOING';
  const messageStyle = MESSAGE_STYLE[sessionActionMessage?.type] ?? MESSAGE_STYLE.info;

  const actionLabel = (action, idleLabel, busyLabel) => (
    sessionActionState === action ? busyLabel : idleLabel
  );

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
            <div className="dashboard-card" style={{ padding: '20px', display: 'grid', gap: '16px' }}>
              <div className="card-header" style={{ marginBottom: 0 }}>
                <div>
                  <h3 className="card-title">Kendali Sesi</h3>
                  <p className="card-subtitle">
                    Absensi dan evaluasi hanya bisa dijalankan selama sesi berlangsung.
                  </p>
                </div>
                <span className={`badge badge-status ${isEvaluating ? 'badge-aktif' : 'badge-tidak-aktif'}`}>
                  {isEvaluating ? 'Evaluasi berjalan' : 'Evaluasi berhenti'}
                </span>
              </div>

              {!isSessionActive && (
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
                  Sesi ini sudah berakhir, sehingga seluruh aksi dinonaktifkan.
                </p>
              )}

              {sessionActionMessage && (
                <div
                  role={sessionActionMessage.type === 'error' ? 'alert' : 'status'}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '12px',
                    fontSize: '0.9rem',
                    background: messageStyle.background,
                    border: `1px solid ${messageStyle.border}`,
                    color: messageStyle.color,
                  }}
                >
                  {sessionActionMessage.text}
                </div>
              )}

              <div style={{ display: 'grid', gap: '8px' }}>
                <label htmlFor="register-student-select" style={{ fontWeight: 600, color: '#1e1b4b' }}>
                  Absensi siswa
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <select
                    id="register-student-select"
                    value={registerStudentId}
                    onChange={(event) => setRegisterStudentId(event.target.value)}
                    disabled={isBusy || !isSessionActive || registerStudentOptions.length === 0}
                    style={{ minWidth: '240px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff' }}
                  >
                    <option value="">
                      {registerStudentOptions.length === 0 ? 'Belum ada siswa di kelas ini' : 'Pilih siswa...'}
                    </option>
                    {registerStudentOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                        {option.nis ? ` (${option.nis})` : ''}
                        {` — ${attendanceLabel(option.status)}`}
                      </option>
                    ))}
                  </select>
                  <ActionButton
                    variant="primary"
                    icon={UserCheck}
                    onClick={() => onRegisterStudentPose(sessionDetail.id)}
                    disabled={isBusy || !isSessionActive || !registerStudentId}
                  >
                    {actionLabel('register', 'Absen Siswa', 'Mengabsen...')}
                  </ActionButton>
                </div>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
                  Pilih siswa, lalu minta siswa tersebut mengangkat tangan di depan kamera sebelum menekan tombol.
                  Pastikan hanya satu siswa yang mengangkat tangan.
                </p>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <ActionButton
                  variant="primary"
                  icon={Play}
                  onClick={() => onStartEvaluation(sessionDetail.id)}
                  disabled={isBusy || !isSessionActive || isEvaluating}
                >
                  {actionLabel('start-eval', 'Mulai Evaluasi', 'Memulai...')}
                </ActionButton>
                <ActionButton
                  variant="secondary"
                  icon={Square}
                  onClick={() => onEndEvaluation(sessionDetail.id)}
                  disabled={isBusy || !isSessionActive || !isEvaluating}
                >
                  {actionLabel('end-eval', 'Hentikan Evaluasi', 'Menghentikan...')}
                </ActionButton>
                <ActionButton
                  variant="danger"
                  icon={Trash2}
                  onClick={() => onEndSession(sessionDetail.id)}
                  disabled={isBusy || !isSessionActive}
                >
                  {actionLabel('end-session', 'Akhiri Sesi', 'Mengakhiri...')}
                </ActionButton>
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
