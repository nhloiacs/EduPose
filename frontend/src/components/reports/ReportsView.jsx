import {
  AlertCircle,
  Award,
  BarChart3,
  Calendar,
  Users,
  Bar,
  Doughnut,
  Line,
  buildClassComparisonChart,
  buildReportsDailyTrendChart,
  buildEmotionDistributionData,
  classComparisonOptions,
  emotionDonutOptions,
  reportsDailyTrendOptions,
} from '../../imports';

const EmptyState = ({ children }) => (
  <div style={{ color: '#64748b', fontSize: '0.92rem', textAlign: 'center' }}>{children}</div>
);

export default function ReportsView({
  students,
  dailyMetrics,
  topClassroomRankings,
  averageAttention,
  topStudent,
  bestClassroom,
  alertCount,
}) {
  const emotionDistributionData = buildEmotionDistributionData(students);
  const dailyTrendData = buildReportsDailyTrendChart(dailyMetrics);
  const classComparisonData = buildClassComparisonChart(topClassroomRankings);

  const hasDailyMetrics = dailyMetrics.length > 0;
  const hasEmotionChartData = emotionDistributionData.datasets[0].data.some((value) => value > 0);
  const hasClassChartData = classComparisonData.labels.length > 0
    && classComparisonData.datasets[0].data.some((value) => value > 0);

  return (
    <div className="view-panel">
      <div className="reports-header-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Calendar size={20} color="#6366f1" />
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Laporan Atensi Siswa</h3>
            <p className="card-subtitle">Ringkasan periode terkini dari sistem</p>
          </div>
        </div>

        <button className="date-picker-trigger">
          <Calendar size={16} />
          <span>Ubah Periode</span>
        </button>
      </div>

      <section className="metrics-grid" style={{ marginBottom: '24px' }}>
        <div className="metric-card">
          <div className="metric-icon-wrapper total"><BarChart3 size={22} /></div>
          <div className="metric-details">
            <div className="metric-label">Rata-rata Atensi</div>
            <div className="metric-value-container">
              <div className="metric-value">{averageAttention ? `${averageAttention}%` : '—'}</div>
              <div className="metric-change up">{averageAttention ? 'Data sistem' : 'Belum ada data'}</div>
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrapper fokus"><Award size={22} /></div>
          <div className="metric-details">
            <div className="metric-label">Siswa Paling Fokus</div>
            <div className="metric-value-container">
              <div className="metric-value" style={{ fontSize: '1.2rem', padding: '6px 0' }}>
                {topStudent ? topStudent.name : 'Belum ada data'}
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#10b981' }}>
                {topStudent ? `(${Number(topStudent.attention ?? 0)}%)` : '(0%)'}
              </span>
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrapper tidak-fokus"><Users size={22} /></div>
          <div className="metric-details">
            <div className="metric-label">Kelas Terbaik</div>
            <div className="metric-value-container">
              <div className="metric-value" style={{ fontSize: '1.4rem', padding: '3px 0' }}>
                {bestClassroom ? bestClassroom.name : 'Belum ada data'}
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#10b981' }}>
                {bestClassroom ? `(${bestClassroom.studentCount} siswa)` : '(0 siswa)'}
              </span>
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrapper peringatan"><AlertCircle size={22} /></div>
          <div className="metric-details">
            <div className="metric-label">Total Peringatan</div>
            <div className="metric-value-container">
              <div className="metric-value">{alertCount}</div>
              <div className="metric-change down">Data sistem</div>
            </div>
          </div>
        </div>
      </section>

      <div className="reports-grid-top">
        <div className="dashboard-card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Tren Atensi Harian</h2>
              <p className="card-subtitle">Perbandingan persentase fokus vs tidak fokus historis</p>
            </div>
          </div>
          <div style={{ height: '280px', position: 'relative', display: 'grid', placeItems: 'center' }}>
            {hasDailyMetrics ? (
              <Line data={dailyTrendData} options={reportsDailyTrendOptions} />
            ) : (
              <EmptyState>Belum ada data tren harian dari sistem.</EmptyState>
            )}
          </div>
        </div>

        <div className="dashboard-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-header">
            <div>
              <h2 className="card-title">Distribusi Emosi</h2>
              <p className="card-subtitle">Akumulasi emosi sepanjang periode</p>
            </div>
          </div>
          <div style={{ height: '180px', position: 'relative', flex: 1, display: 'grid', placeItems: 'center' }}>
            {hasEmotionChartData ? (
              <Doughnut data={emotionDistributionData} options={emotionDonutOptions} />
            ) : (
              <EmptyState>Belum ada data emosi dari sistem.</EmptyState>
            )}
          </div>

          {hasEmotionChartData && (
            <div className="custom-legend">
              {emotionDistributionData.labels.map((label, index) => (
                <div key={label} className="legend-item">
                  <span
                    className="legend-color"
                    style={{ backgroundColor: emotionDistributionData.datasets[0].backgroundColor[index] }}
                  />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="reports-grid-bottom">
        <div className="dashboard-card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Perbandingan Atensi per Kelas</h2>
              <p className="card-subtitle">Rata-rata tingkat fokus siswa antar kelas</p>
            </div>
          </div>
          <div style={{ height: '280px', position: 'relative', display: 'grid', placeItems: 'center' }}>
            {hasClassChartData ? (
              <Bar data={classComparisonData} options={classComparisonOptions} />
            ) : (
              <EmptyState>Belum ada data kelas dari sistem.</EmptyState>
            )}
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Tren Emosi Harian</h2>
              <p className="card-subtitle">Akumulasi sebaran emosi terdeteksi per hari</p>
            </div>
          </div>
          <div style={{ height: '280px', position: 'relative', display: 'grid', placeItems: 'center' }}>
            <EmptyState>Belum ada data emosi historis dari sistem.</EmptyState>
          </div>
        </div>
      </div>
    </div>
  );
}
