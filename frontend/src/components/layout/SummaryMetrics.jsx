import { BookOpen, Camera, TrendingUp, Users, Video } from '../../imports';

function MetricCard({ icon: Icon, tone, label, value, changes = [], stacked = false }) {
  return (
    <div className="metric-card">
      <div className={`metric-icon-wrapper ${tone}`}>
        <Icon size={22} />
      </div>
      <div className="metric-details">
        <div className="metric-label">{label}</div>
        <div
          className="metric-value-container"
          style={stacked ? { gap: '8px', flexDirection: 'column', alignItems: 'flex-start' } : undefined}
        >
          <div className="metric-value">{value}</div>
          {changes.map((change) => (
            <div key={change.text} className={`metric-change ${change.direction}`}>{change.text}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SummaryMetrics({
  isPrincipalUser,
  dashboardSummary,
  totalStudentsCount,
  totalClassroomsCount,
  totalTeachersCount,
  totalSubjectsCount,
  totalCamerasCount,
  teacherAvgFocus,
  teacherAvgActiveStudents,
  teacherUsingPhone,
  teacherRaisedHand,
}) {
  const sourceLabel = dashboardSummary ? 'Data backend' : 'Belum ada data';

  return (
    <section className="metrics-grid">
      {isPrincipalUser ? (
        <>
          <MetricCard icon={Users} tone="total" label="Total Siswa" value={totalStudentsCount} changes={[{ text: sourceLabel, direction: 'up' }]} />
          <MetricCard icon={Video} tone="fokus" label="Total Kelas" value={totalClassroomsCount} changes={[{ text: sourceLabel, direction: 'up' }]} />
          <MetricCard icon={Users} tone="tidak-fokus" label="Total Guru" value={totalTeachersCount} changes={[{ text: sourceLabel, direction: 'down' }]} />
          <MetricCard icon={BookOpen} tone="peringatan" label="Total Mapel" value={totalSubjectsCount} changes={[{ text: sourceLabel, direction: 'up' }]} />
          <MetricCard icon={Camera} tone="fokus" label="Total Kamera" value={totalCamerasCount} changes={[{ text: sourceLabel, direction: 'up' }]} />
        </>
      ) : (
        <>
          <MetricCard icon={Video} tone="fokus" label="Total Kelas Diajarkan" value={totalClassroomsCount} changes={[{ text: sourceLabel, direction: 'up' }]} />
          <MetricCard icon={Users} tone="total" label="Total Siswa" value={totalStudentsCount} changes={[{ text: sourceLabel, direction: 'up' }]} />
          <MetricCard icon={BookOpen} tone="peringatan" label="Total Mapel Unik" value={totalSubjectsCount} changes={[{ text: sourceLabel, direction: 'up' }]} />
          <MetricCard
            icon={TrendingUp}
            tone="peringatan"
            label="Performa Metrik Kelas"
            value={`${Number(teacherAvgFocus ?? 0).toFixed(1)}%`}
            stacked
            changes={[
              { text: `Aktif: ${teacherAvgActiveStudents}`, direction: 'up' },
              { text: `HP: ${teacherUsingPhone}`, direction: 'down' },
              { text: `Angkat tangan: ${teacherRaisedHand}`, direction: 'up' },
            ]}
          />
        </>
      )}
    </section>
  );
}
