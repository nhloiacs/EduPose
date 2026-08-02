import { formatMetricValue } from '../../imports';

const MetricBox = ({ label, value }) => (
  <div className="metric-card">
    <div className="metric-label">{label}</div>
    <div className="metric-value">{value}</div>
  </div>
);

export default function ClassroomDetailView({
  classroomDetail,
  classroomDetailLoading,
  classroomDetailError,
  onBack,
}) {
  if (!classroomDetail) return null;

  const metrics = classroomDetail.classroom?.metrics_summary ?? {};

  return (
    <div className="view-panel">
      <div className="table-header-section" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', width: '100%' }}>
          <div>
            <h2 className="card-title" style={{ fontSize: '1.2rem' }}>Detail Kelas</h2>
            <p className="card-subtitle">Informasi sesi dan siswa untuk kelas terpilih.</p>
          </div>
          <button type="button" className="btn-secondary" onClick={onBack}>Kembali ke Kelas</button>
        </div>
      </div>

      {classroomDetailLoading && (
        <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '16px', marginBottom: '16px' }}>
          Memuat detail kelas...
        </div>
      )}

      {classroomDetailError && (
        <p role="alert" style={{ color: '#b91c1c', marginBottom: '16px' }}>{classroomDetailError}</p>
      )}

      <div className="modal-detail-card">
        <div className="modal-detail-row">
          <span className="modal-detail-label">Nama Kelas</span>
          <span className="modal-detail-value">{classroomDetail.classroom?.name || '-'}</span>
        </div>
        <div className="modal-detail-row">
          <span className="modal-detail-label">Classroom ID</span>
          <span className="modal-detail-value">{classroomDetail.classroom?.id || '-'}</span>
        </div>
        <div className="modal-detail-row">
          <span className="modal-detail-label">Jumlah Siswa</span>
          <span className="modal-detail-value">{classroomDetail.students?.length ?? 0}</span>
        </div>
      </div>

      <div className="dashboard-card" style={{ padding: '20px' }}>
        <div className="card-header" style={{ marginBottom: '18px' }}>
          <div>
            <h3 className="card-title">Ringkasan Metrik Kelas</h3>
            <p className="card-subtitle">Rata-rata metrik kelas berdasarkan sesi yang tersedia.</p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px' }}>
          <MetricBox label="Rata-rata Fokus" value={`${formatMetricValue(metrics.avg_focus_percentage)}%`} />
          <MetricBox label="Rata-rata Siswa Aktif" value={formatMetricValue(metrics.avg_active_students)} />
          <MetricBox label="Rata-rata Pakai HP" value={formatMetricValue(metrics.avg_using_phone_count)} />
          <MetricBox label="Rata-rata Angkat Tangan" value={formatMetricValue(metrics.avg_raised_hand_count)} />
        </div>
      </div>

      <div className="dashboard-card" style={{ padding: '20px' }}>
        <div className="card-header" style={{ marginBottom: '18px' }}>
          <div>
            <h3 className="card-title">Siswa di Kelas</h3>
            <p className="card-subtitle">Daftar siswa yang terdaftar di kelas ini.</p>
          </div>
        </div>
        {classroomDetail.students?.length > 0 ? (
          <div style={{ display: 'grid', gap: '10px' }}>
            {classroomDetail.students.map((student) => (
              <div
                key={student.id}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: '16px', background: '#f8fafc', border: '1px solid rgba(99, 102, 241, 0.12)' }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: '#1e1b4b' }}>{student.name}</div>
                  <div style={{ color: '#64748b', fontSize: '0.85rem' }}>{student.nis || 'NIS tidak tersedia'}</div>
                </div>
                <span className="badge badge-aktif">
                  {student.attention ? `${student.attention}% fokus` : 'Belum ada metrik'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: '#64748b', fontSize: '0.92rem' }}>
            Belum ada siswa yang terdaftar di kelas ini.
          </div>
        )}
      </div>
    </div>
  );
}
