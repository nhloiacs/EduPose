import {
  Clock,
  Bar,
  Line,
  buildDailyAttentionChart,
  buildClassComparisonChart,
  buildTopStudentPerformersData,
  classComparisonOptions,
  dailyAttentionOptions,
  topStudentPerformersOptions,
} from '../../imports';

const EmptyState = ({ children }) => (
  <div style={{ color: '#64748b', fontSize: '0.92rem', textAlign: 'center' }}>{children}</div>
);

const RANGE_OPTIONS = [
  { days: 7, label: '7 hari' },
  { days: 30, label: '30 hari' },
  { days: 90, label: '90 hari' },
  { days: 365, label: '1 tahun' },
];

export default function DashboardView({
  isInitialLoading,
  dailyMetrics,
  metricsRangeDays,
  onMetricsRangeChange,
  metricsRangeUsed,
  metricsError,
  topClassroomRankings,
  topStudentPerformers,
  warnings,
  isLiveWarnings,
}) {
  const hasDailyMetrics = dailyMetrics.length > 0;
  const dailyAttentionData = buildDailyAttentionChart(dailyMetrics);
  const classComparisonData = buildClassComparisonChart(topClassroomRankings);

  // Rentang otomatis dilebarkan bila rentang pilihan belum menghasilkan data.
  const isRangeWidened = hasDailyMetrics && metricsRangeUsed > metricsRangeDays;

  return (
    <div className="view-panel">
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <div className="card-header" style={{ alignItems: 'flex-start' }}>
            <div>
              <h2 className="card-title">Tren Atensi Harian</h2>
              {hasDailyMetrics && (
                <p className="card-subtitle">
                  {dailyMetrics.length} titik data, {metricsRangeUsed} hari terakhir
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {RANGE_OPTIONS.map((option) => (
                <button
                  key={option.days}
                  type="button"
                  onClick={() => onMetricsRangeChange(option.days)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '999px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: `1px solid ${metricsRangeDays === option.days ? '#6366f1' : '#e2e8f0'}`,
                    background: metricsRangeDays === option.days ? '#6366f1' : '#ffffff',
                    color: metricsRangeDays === option.days ? '#ffffff' : '#64748b',
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {isRangeWidened && (
            <p style={{ margin: '0 0 8px', fontSize: '0.82rem', color: '#b45309' }}>
              Tidak ada data pada {metricsRangeDays} hari terakhir, grafik menampilkan {metricsRangeUsed} hari terakhir.
            </p>
          )}

          <div style={{ height: '280px', position: 'relative', display: 'grid', placeItems: 'center' }}>
            {isInitialLoading ? (
              <div style={{ color: '#64748b', fontSize: '0.92rem' }}>Memuat grafik dari sistem...</div>
            ) : metricsError ? (
              <div style={{ color: '#b91c1c', fontSize: '0.9rem', textAlign: 'center', maxWidth: '420px' }} role="alert">
                <strong style={{ display: 'block', marginBottom: '6px' }}>Gagal memuat /dashboard/metrics</strong>
                {metricsError}
              </div>
            ) : hasDailyMetrics ? (
              <Line data={dailyAttentionData} options={dailyAttentionOptions} />
            ) : (
              <EmptyState>
                Belum ada sesi kelas yang memiliki metrik pada rentang tanggal mana pun.
                Grafik akan terisi setelah ada sesi yang dievaluasi.
              </EmptyState>
            )}
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Peringkat Kelas Terbaik</h2>
            </div>
          </div>
          <div style={{ height: '280px', position: 'relative', display: 'grid', placeItems: 'center' }}>
            {topClassroomRankings.length > 0 ? (
              <Bar data={classComparisonData} options={classComparisonOptions} />
            ) : (
              <EmptyState>Belum ada data top classroom performers dari sistem.</EmptyState>
            )}
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Peringatan Atensi Siswa</h2>
              <p className="card-subtitle">
                {isLiveWarnings
                  ? `${warnings.length} siswa tidak fokus saat ini`
                  : warnings.length > 0
                    ? `${warnings.length} siswa perlu perhatian (rata-rata historis)`
                    : 'Belum ada peringatan'}
              </p>
            </div>
            {isLiveWarnings && (
              <span className="badge badge-status badge-aktif">Real-time</span>
            )}
          </div>
          {/* Tinggi dikunci ~4 kartu peringatan, sisanya bisa di-scroll. */}
          <div style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '6px' }}>
            <div className="warnings-list">
              {warnings.length > 0 ? (
                warnings.map((warning) => (
                  <div className="warning-item" key={warning.id}>
                    <div className="warning-content">
                      <div className="warning-student">{warning.name}</div>
                      <div className="warning-desc">{warning.desc}</div>
                    </div>
                    <div className="warning-time">
                      <Clock size={12} />
                      {warning.time}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ color: '#64748b', fontSize: '0.92rem' }}>
                  {isLiveWarnings
                    ? 'Semua siswa yang terpantau sedang fokus.'
                    : 'Belum ada peringatan dari sistem.'}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Peringkat Siswa Terbaik</h2>
            </div>
          </div>
          <div style={{ height: '280px', position: 'relative', display: 'grid', placeItems: 'center' }}>
            {topStudentPerformers.length > 0 ? (
              <Bar
                data={buildTopStudentPerformersData(topStudentPerformers)}
                options={topStudentPerformersOptions}
              />
            ) : (
              <EmptyState>Belum ada data top student performers dari sistem.</EmptyState>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
