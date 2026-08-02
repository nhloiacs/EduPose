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

export default function DashboardView({
  isInitialLoading,
  dailyMetrics,
  topClassroomRankings,
  topStudentPerformers,
  warnings,
}) {
  const hasDailyMetrics = dailyMetrics.length > 0;
  const dailyAttentionData = buildDailyAttentionChart(dailyMetrics);
  const classComparisonData = buildClassComparisonChart(topClassroomRankings);

  return (
    <div className="view-panel">
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Get Metrics</h2>
              <p className="card-subtitle">Endpoint: /dashboard/metrics (granularity=daily)</p>
            </div>
          </div>
          <div style={{ height: '280px', position: 'relative', display: 'grid', placeItems: 'center' }}>
            {isInitialLoading ? (
              <div style={{ color: '#64748b', fontSize: '0.92rem' }}>Memuat grafik dari backend...</div>
            ) : hasDailyMetrics ? (
              <Line data={dailyAttentionData} options={dailyAttentionOptions} />
            ) : (
              <EmptyState>Belum ada data harian dari backend untuk grafik ini.</EmptyState>
            )}
          </div>
        </div>

        <div className="dashboard-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="card-header">
              <div>
                <h2 className="card-title">Top Classroom Performers</h2>
                <p className="card-subtitle">Endpoint: /dashboard/top-performers/classroom</p>
              </div>
            </div>
            <div style={{ height: '220px', position: 'relative', display: 'grid', placeItems: 'center' }}>
              {topClassroomRankings.length > 0 ? (
                <Bar data={classComparisonData} options={classComparisonOptions} />
              ) : (
                <EmptyState>Belum ada data top classroom performers dari backend.</EmptyState>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="card-header">
              <div>
                <h2 className="card-title">Top Student Performers</h2>
                <p className="card-subtitle">Endpoint: /dashboard/top-performers/student</p>
              </div>
            </div>
            <div style={{ minHeight: '220px', position: 'relative', display: 'grid', placeItems: 'center' }}>
              {topStudentPerformers.length > 0 ? (
                <Bar
                  data={buildTopStudentPerformersData(topStudentPerformers)}
                  options={topStudentPerformersOptions}
                />
              ) : (
                <EmptyState>Belum ada data top student performers dari backend.</EmptyState>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card" style={{ width: '100%' }}>
          <div className="card-header">
            <div>
              <h2 className="card-title">Get Dashboard Warnings</h2>
              <p className="card-subtitle">Endpoint: /dashboard/warnings/{'{entity}'} (threshold)</p>
            </div>
          </div>
          <div style={{ minHeight: '160px' }}>
            <div className="warnings-list">
              {warnings.length > 0 ? (
                warnings.slice(0, 10).map((warning) => (
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
                  Belum ada peringatan dari backend.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
