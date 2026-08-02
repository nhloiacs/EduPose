import { formatClockLabel } from '../../imports';

export default function SyncStatusBanner({
  isInitialLoading,
  isRefreshing,
  errorMessage,
  lastSyncedAt,
}) {
  if (!isInitialLoading && !isRefreshing && !errorMessage && !lastSyncedAt) return null;

  const background = errorMessage
    ? 'rgba(239, 68, 68, 0.08)'
    : isInitialLoading
      ? 'rgba(99, 102, 241, 0.08)'
      : 'rgba(16, 185, 129, 0.08)';

  const title = errorMessage
    ? 'Sinkronisasi gagal'
    : isInitialLoading
      ? 'Memuat data dashboard'
      : isRefreshing
        ? 'Menyegarkan data dashboard'
        : 'Data dashboard siap';

  const description = errorMessage
    || (isInitialLoading
      ? 'Sedang mengambil data backend untuk statistik, chart, dan tabel.'
      : isRefreshing
        ? 'Refresh otomatis berjalan tanpa mengganggu data yang sedang tampil.'
        : `Terakhir sinkron ${formatClockLabel(lastSyncedAt)}`);

  return (
    <section
      style={{
        margin: '0 0 20px',
        padding: '14px 18px',
        borderRadius: '16px',
        background,
        border: `1px solid ${errorMessage ? 'rgba(239, 68, 68, 0.18)' : 'rgba(99, 102, 241, 0.12)'}`,
        display: 'flex',
        justifyContent: 'space-between',
        gap: '16px',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}
    >
      <div>
        <div style={{ fontWeight: 700, color: '#1e1b4b', marginBottom: '4px' }}>{title}</div>
        <div style={{ color: '#64748b', fontSize: '0.92rem' }}>{description}</div>
      </div>
      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>
        Auto refresh 30 detik
      </div>
    </section>
  );
}
