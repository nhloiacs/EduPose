import {
  useState,
  Play,
  Square,
  Trash2,
  UserCheck,
  ActionButton,
  Modal,
  attendanceLabel,
  getMonitorStreamUrl,
  formatDateTimeLabel,
  formatMetricValue,
} from '../../imports';
import '../../styles/attendance.css';

const initialsOf = (name = '') => name
  .split(' ')
  .filter(Boolean)
  .slice(0, 2)
  .map((word) => word[0].toUpperCase())
  .join('') || '?';

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
  const [isAttendanceOpen, setAttendanceOpen] = useState(false);
  const [previewError, setPreviewError] = useState(false);

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
                <span style={{ fontWeight: 600, color: '#1e1b4b' }}>Absensi siswa</span>
                <div>
                  <ActionButton
                    variant="primary"
                    icon={UserCheck}
                    onClick={() => { setPreviewError(false); setAttendanceOpen(true); }}
                    disabled={isBusy || !isSessionActive}
                  >
                    Absensi Siswa
                  </ActionButton>
                </div>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
                  Buka halaman absensi untuk memilih siswa dan mencatat kehadiran lewat kamera.
                </p>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                {isEvaluating ? (
                  <ActionButton
                    variant="secondary"
                    icon={Square}
                    onClick={() => onEndEvaluation(sessionDetail.id)}
                    disabled={isBusy || !isSessionActive}
                  >
                    {actionLabel('end-eval', 'Hentikan Evaluasi', 'Menghentikan...')}
                  </ActionButton>
                ) : (
                  <ActionButton
                    variant="primary"
                    icon={Play}
                    onClick={() => onStartEvaluation(sessionDetail.id)}
                    disabled={isBusy || !isSessionActive}
                  >
                    {actionLabel('start-eval', 'Mulai Evaluasi', 'Memulai...')}
                  </ActionButton>
                )}
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

      {isAttendanceOpen && sessionDetail && (
        <Modal
          id="session-attendance-modal-title"
          title="Absensi Siswa"
          subtitle="Catat kehadiran siswa melalui deteksi kamera."
          closeLabel="Tutup halaman absensi"
          wide={false}
          onClose={() => setAttendanceOpen(false)}
        >
          <div style={{ display: 'grid', gap: '16px' }}>
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
              <span style={{ fontWeight: 600, color: '#1e1b4b' }}>Kamera kelas</span>
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '4 / 3',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  background: '#0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {previewError ? (
                  <p style={{ color: '#e2e8f0', fontSize: '0.85rem', textAlign: 'center', padding: '0 18px' }}>
                    Kamera belum aktif. Buka menu <strong>Live Camera Feed</strong> dan tekan
                    {' '}<strong>Mulai Stream</strong> untuk sesi ini terlebih dahulu.
                  </p>
                ) : (
                  <img
                    src={getMonitorStreamUrl(sessionDetail.id)}
                    alt="Pratinjau kamera kelas"
                    onError={() => setPreviewError(true)}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                )}
              </div>

              <span style={{ fontWeight: 600, color: '#1e1b4b' }}>Pilih siswa</span>
              <div className="attendance-picker">
                {registerStudentOptions.length === 0 ? (
                  <div className="attendance-empty">Belum ada siswa di kelas ini.</div>
                ) : (
                  registerStudentOptions.map((option) => {
                    const isPresent = String(option.status || '').toUpperCase() === 'PRESENT';
                    return (
                      <button
                        type="button"
                        key={option.id}
                        className={`attendance-option${registerStudentId === option.id ? ' is-selected' : ''}`}
                        onClick={() => setRegisterStudentId(
                          registerStudentId === option.id ? '' : option.id,
                        )}
                        disabled={isBusy || !isSessionActive}
                      >
                        <span className="attendance-avatar">{initialsOf(option.name)}</span>
                        <span className="attendance-info">
                          <span className="attendance-name">{option.name}</span>
                          {option.nis && <span className="attendance-nis">{option.nis}</span>}
                        </span>
                        <span className={`attendance-status${isPresent ? ' is-present' : ''}`}>
                          {attendanceLabel(option.status)}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
                Pilih siswa, lalu minta siswa tersebut mengangkat tangan di depan kamera sebelum menekan tombol.
                Pastikan hanya satu siswa yang mengangkat tangan.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
              <ActionButton variant="secondary" onClick={() => setAttendanceOpen(false)}>
                Tutup
              </ActionButton>
              <ActionButton
                variant="primary"
                icon={UserCheck}
                onClick={() => onRegisterStudentPose(sessionDetail.id)}
                disabled={isBusy || !isSessionActive || !registerStudentId}
              >
                {actionLabel('register', 'Absen Siswa', 'Mengabsen...')}
              </ActionButton>
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  );
}
