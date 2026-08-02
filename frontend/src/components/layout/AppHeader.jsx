import { Search } from '../../imports';

const TAB_TITLES = {
  dashboard: 'Dashboard',
  live: 'Live Camera Feed',
  students: 'Data Siswa',
  classrooms: 'Data Kelas',
  sessions: 'Riwayat Sesi',
  reports: 'Laporan Atensi & Emosi',
  profile: 'Profil & Pengaturan Sistem',
  teachers: 'Manajemen Guru',
};

const TAB_SUBTITLES = {
  dashboard: 'Selamat datang! Berikut ringkasan data atensi siswa hari ini.',
  live: 'Pemantauan kelas real-time dengan model deteksi AI Raspberry Pi.',
  students: 'Daftar siswa beserta metrik atensi dan emosi real-time.',
  classrooms: 'Kelola kelas dan sinkronisasi pilihan kelas untuk siswa.',
  'classroom-detail': 'Detail kelas berisi sesi dan daftar siswa.',
  reports: 'Analisis tren atensi dan distribusi emosi siswa secara historis.',
  profile: 'Profil teacher tersinkron dengan backend serta pengaturan sistem.',
  teachers: 'Tambah dan ubah data teacher.',
};

const SEARCH_PLACEHOLDERS = {
  students: 'Cari siswa, kelas, atau atensi...',
  classrooms: 'Cari nama classroom...',
  sessions: 'Cari sesi, kelas, guru, atau kamera...',
  cameras: 'Cari nama kamera atau endpoint...',
  teachers: 'Cari teacher, NIP, atau email...',
};

const SEARCHABLE_TABS = ['students', 'classrooms', 'teachers', 'sessions', 'cameras'];

export default function AppHeader({
  activeTab,
  searchQuery,
  onSearchChange,
  backendHealthState,
}) {
  const showSearchBar = SEARCHABLE_TABS.includes(activeTab);
  const healthClass = backendHealthState === 'online'
    ? 'connected'
    : backendHealthState === 'checking'
      ? 'connecting'
      : 'error';

  return (
    <header className="header">
      <div className="welcome-section">
        <h1>{TAB_TITLES[activeTab] ?? ''}</h1>
        <p>{TAB_SUBTITLES[activeTab] ?? ''}</p>
      </div>

      <div className="header-actions">
        {showSearchBar && (
          <div className="search-bar">
            <Search size={18} color="#64748b" />
            <input
              type="text"
              placeholder={SEARCH_PLACEHOLDERS[activeTab] ?? 'Cari...'}
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </div>
        )}

        <div className="connection-status connection-connected">
          <span className="connection-dot" />
          <div className="connection-copy">
            <span className="connection-label">Live Stream</span>
            <strong>Akses stream via endpoint Stream Session</strong>
          </div>
        </div>

        <div style={{ width: 12 }} />

        <div className={`connection-status connection-${healthClass}`}>
          <span className="connection-dot" />
          <div className="connection-copy">
            <span className="connection-label">Backend API</span>
            <strong>
              {backendHealthState === 'online' && 'Backend aktif'}
              {backendHealthState === 'checking' && 'Memeriksa'}
              {backendHealthState === 'offline' && 'Backend tidak aktif'}
            </strong>
          </div>
        </div>
      </div>
    </header>
  );
}
