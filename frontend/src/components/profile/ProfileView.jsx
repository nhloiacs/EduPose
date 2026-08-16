import { Cpu, LogOut, Settings, User } from '../../imports';

const SYNC_STATUS = {
  connected: { label: 'Tersinkron dengan sistem', color: '#10b981' },
  loading: { label: 'Menyinkronkan data...', color: '#6366f1' },
  error: { label: 'Sinkronisasi gagal', color: '#ef4444' },
  idle: { label: 'Belum tersinkron', color: '#94a3b8' },
};

const roleLabel = (currentUser, profileData) => {
  if (currentUser?.role === 'principal') return 'Kepala Sekolah';
  if (currentUser?.role === 'teacher') return 'Guru';
  return profileData.role || '';
};

const DetailRow = ({ label, children }) => (
  <div className="modal-detail-row">
    <span className="modal-detail-label">{label}</span>
    <span className="modal-detail-value">{children}</span>
  </div>
);

export default function ProfileView({
  profileData,
  profileError,
  syncState,
  currentUser,
  totalStudentsCount,
  totalTeachersCount,
  totalClassroomsCount,
  onLogout,
}) {
  const syncStatus = SYNC_STATUS[syncState] ?? SYNC_STATUS.idle;

  // Jumlah guru hanya relevan untuk kepala sekolah.
  const syncStats = [
    { label: 'Siswa', value: totalStudentsCount ?? 0 },
    { label: 'Kelas', value: totalClassroomsCount ?? 0 },
    ...(currentUser?.role === 'principal'
      ? [{ label: 'Guru', value: totalTeachersCount ?? 0 }]
      : []),
  ];

  return (
    <div className="view-panel">
      <div className="profile-grid">
        <div className="profile-sidebar-card">
          <div className="profile-avatar-large">
            <span>{profileData.avatarInitials}</span>
          </div>
          <h3 className="profile-name">{profileData.name}</h3>
          <span className="profile-role">{roleLabel(currentUser, profileData)}</span>

          <div className="profile-stats-mini">
            <div className="mini-stat-box">
              <div className="mini-stat-val">{totalStudentsCount}</div>
              <div className="mini-stat-lbl">Total Siswa</div>
            </div>
            <div className="mini-stat-box">
              <div className="mini-stat-val" style={{ color: '#10b981' }}>Active</div>
              <div className="mini-stat-lbl">Raspberry PI</div>
            </div>
          </div>

          <div className="pi-connection-card" style={{ width: '100%', marginTop: '32px' }}>
            <div className="pi-info">
              <div className="pi-icon-container"><Cpu size={20} /></div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b' }}>DEVICE IP</div>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#1e1b4b' }}>{profileData.deviceIP}</div>
              </div>
            </div>
            <div className="pi-conn-status">
              <span className="pulse-dot" />
              <span>ON</span>
            </div>
          </div>

          <button
            type="button"
            className="btn-primary"
            onClick={onLogout}
            style={{ width: '100%', marginTop: '16px', background: '#ef4444', justifyContent: 'center' }}
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          <div className="profile-details-card">
            <h3 className="profile-section-title">
              <Settings size={18} color="#6366f1" />
              <span>Sinkronisasi Sistem</span>
            </h3>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
              <span
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: syncStatus.color,
                  flexShrink: 0,
                }}
              />
              <span style={{ fontWeight: 700, color: '#1e1b4b' }}>{syncStatus.label}</span>
            </div>

            {profileError && <p role="alert" style={{ color: '#b91c1c', margin: '0 0 16px' }}>{profileError}</p>}

            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${syncStats.length}, minmax(0, 1fr))`, gap: '12px' }}>
              {syncStats.map((stat) => (
                <div
                  key={stat.label}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '14px',
                    background: '#f8fafc',
                    border: '1px solid var(--border)',
                    alignItems: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e1b4b' }}>{stat.value}</div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="profile-details-card">
            <h3 className="profile-section-title">
              <User size={18} color="#6366f1" />
              <span>Informasi Akun Pengajar</span>
            </h3>

            {/* Hanya tampilan detail: backend tidak menyediakan endpoint bagi
                guru untuk memperbarui profilnya sendiri. */}
            <div className="modal-detail-card">
              <DetailRow label="Nama Lengkap">{profileData.name || '-'}</DetailRow>
              <DetailRow label="Email">{profileData.email || '-'}</DetailRow>
              <DetailRow label="NIP / Nomor Identitas">{profileData.nip || '-'}</DetailRow>
              <DetailRow label="Peran">{roleLabel(currentUser, profileData)}</DetailRow>
            </div>

            <p style={{ marginTop: '16px', fontSize: '0.85rem', color: '#64748b' }}>
              Perubahan data guru hanya dapat dilakukan oleh kepala sekolah melalui menu Guru.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
