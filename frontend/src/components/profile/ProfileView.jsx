import { Cpu, Save, Settings, User } from '../../imports';

const roleLabel = (currentUser, profileData) => {
  if (currentUser?.role === 'principal') return 'Kepala Sekolah';
  if (currentUser?.role === 'teacher') return 'Guru';
  return profileData.role || '';
};

export default function ProfileView({
  profileData,
  setProfileData,
  profileError,
  backendMessage,
  currentUser,
  totalStudentsCount,
  totalTeachersCount,
  totalClassroomsCount,
  onSaveProfile,
  onLogout,
}) {
  const updateField = (field) => (event) => {
    const { type, value, checked } = event.target;
    setProfileData({ ...profileData, [field]: type === 'checkbox' ? checked : value });
  };

  const updateNumberField = (field) => (event) => {
    setProfileData({ ...profileData, [field]: parseInt(event.target.value, 10) });
  };

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
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          <div className="profile-details-card">
            <h3 className="profile-section-title">
              <Settings size={18} color="#6366f1" />
              <span>Sinkronisasi Backend</span>
            </h3>

            <p className="card-subtitle" style={{ marginBottom: '16px' }}>{backendMessage}</p>
            {profileError && <p role="alert" style={{ color: '#b91c1c', margin: '0 0 16px' }}>{profileError}</p>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gap: '8px' }}>
                <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>User aktif</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1e1b4b' }}>{profileData.name}</div>
                <div style={{ fontSize: '0.92rem', color: '#64748b' }}>{profileData.email || 'Email tidak tersedia'}</div>
                <div style={{ fontSize: '0.92rem', color: '#64748b' }}>
                  {totalTeachersCount ?? 0} guru, {totalClassroomsCount ?? 0} kelas tersinkron
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button type="button" className="save-btn" onClick={onLogout} style={{ background: '#ef4444' }}>
                  Logout
                </button>
              </div>
            </div>
          </div>

          <div className="profile-details-card">
            <h3 className="profile-section-title">
              <User size={18} color="#6366f1" />
              <span>Informasi Akun Pengajar</span>
            </h3>

            <form onSubmit={onSaveProfile}>
              <div className="profile-fields-grid">
                <div className="profile-field-group">
                  <label>Nama Lengkap</label>
                  <input type="text" value={profileData.name} onChange={updateField('name')} />
                </div>
                <div className="profile-field-group">
                  <label>NIP / Nomor Identitas</label>
                  <input type="text" value={profileData.nip} onChange={updateField('nip')} />
                </div>
                <div className="profile-field-group">
                  <label>Sekolah</label>
                  <input type="text" value={profileData.school} onChange={updateField('school')} />
                </div>
                <div className="profile-field-group">
                  <label>Mata Pelajaran & Kelas</label>
                  <input type="text" value={profileData.subject} onChange={updateField('subject')} />
                </div>
              </div>

              <h3 className="profile-section-title" style={{ marginTop: '36px' }}>
                <Cpu size={18} color="#6366f1" />
                <span>Raspberry Pi & AI Model Config</span>
              </h3>

              <div className="profile-fields-grid" style={{ marginBottom: '24px' }}>
                <div className="profile-field-group">
                  <label>Perangkat Terkoneksi</label>
                  <input type="text" readOnly value={profileData.deviceName} style={{ background: '#f8fafc', borderColor: '#e2e8f0', color: '#64748b' }} />
                </div>
                <div className="profile-field-group">
                  <label>Resolusi Kamera</label>
                  <input type="text" value={profileData.cameraRes} onChange={updateField('cameraRes')} />
                </div>
                <div className="profile-field-group" style={{ gridColumn: 'span 2' }}>
                  <label>Model Deteksi Wajah & Emosi</label>
                  <input type="text" readOnly value={profileData.detectionModel} style={{ background: '#f8fafc', borderColor: '#e2e8f0', color: '#64748b' }} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '24px 0', background: '#fafafc', padding: '16px 20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
                  Aturan Ambang Batas (Thresholds)
                </h4>

                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                    <span>Akurasi Deteksi Mengantuk</span>
                    <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{profileData.sleepThreshold}%</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="90"
                    value={profileData.sleepThreshold}
                    onChange={updateNumberField('sleepThreshold')}
                    style={{ width: '100%', accentColor: 'var(--primary)' }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                    <span>Batas Durasi Tidak Fokus (Alarm)</span>
                    <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{profileData.unfocusThreshold} Menit</span>
                  </div>
                  <input
                    type="range"
                    min="3"
                    max="30"
                    value={profileData.unfocusThreshold}
                    onChange={updateNumberField('unfocusThreshold')}
                    style={{ width: '100%', accentColor: 'var(--primary)' }}
                  />
                </div>
              </div>

              <h3 className="profile-section-title" style={{ marginTop: '36px' }}>
                <Settings size={18} color="#6366f1" />
                <span>Fungsi & Otomatisasi Sistem</span>
              </h3>

              <div style={{ marginBottom: '32px' }}>
                <div className="switch-group">
                  <div className="switch-label-block">
                    <span className="switch-title">Simpan Rekaman Peringatan</span>
                    <span className="switch-desc">
                      Merekam klip video 15 detik ke penyimpanan Raspberry Pi ketika siswa terdeteksi mengantuk/tidak fokus.
                    </span>
                  </div>
                  <label className="toggle-switch">
                    <input type="checkbox" checked={profileData.autoRecord} onChange={updateField('autoRecord')} />
                    <span className="slider-round" />
                  </label>
                </div>

                <div className="switch-group">
                  <div className="switch-label-block">
                    <span className="switch-title">Push Notifikasi Real-time</span>
                    <span className="switch-desc">
                      Mengirim alarm langsung ke perangkat mobile pengajar saat terjadi anomali atensi kelas.
                    </span>
                  </div>
                  <label className="toggle-switch">
                    <input type="checkbox" checked={profileData.pushNotification} onChange={updateField('pushNotification')} />
                    <span className="slider-round" />
                  </label>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <button type="submit" className="btn-primary">
                  <Save size={18} />
                  <span>Simpan Pengaturan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
