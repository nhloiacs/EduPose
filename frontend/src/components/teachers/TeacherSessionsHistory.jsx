import '../../styles/TeacherSessionsHistory.css';
import {
  useState,
  useEffect,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  BookOpen,
  Users,
  Search,
  AlertCircle,
  Loader,
  getTeacherSessions,
} from '../../imports';

const formatTime = (timestamp) => {
  if (!timestamp) return '-';
  const parsedTime = new Date(timestamp);
  if (Number.isNaN(parsedTime.getTime())) return '-';
  return parsedTime.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDate = (timestamp) => {
  if (!timestamp) return '-';
  const parsedTime = new Date(timestamp);
  if (Number.isNaN(parsedTime.getTime())) return '-';
  return parsedTime.toLocaleDateString('id-ID', {
    dateStyle: 'medium',
  });
};

export default function TeacherSessionsHistory({
  teacherId,
  teacherName,
  authToken,
  onClose,
}) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalSessions, setTotalSessions] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchSessions();
  }, [page, pageSize]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!teacherId) {
        setError('Teacher ID tidak valid');
        setLoading(false);
        return;
      }

      const params = {
        page,
        size: pageSize,
      };

      console.log('Fetching teacher sessions:', { teacherId, params, authToken: authToken ? 'yes' : 'no' });

      const response = await getTeacherSessions(teacherId, authToken, params);
      
      console.log('Teacher sessions response:', response);

      // Response dari listCollection -> normalizePaginatedResponse
      // Format: { message, data, raw, items: [...], meta: {...} }
      const items = Array.isArray(response?.items) ? response.items : [];
      const total = response?.meta?.total || 0;

      console.log('Parsed sessions:', { items, total });

      setSessions(items);
      setTotalSessions(total);
    } catch (err) {
      console.error('Fetch teacher sessions error:', err);
      const errorMsg = err.message || 'Gagal memuat riwayat sesi guru. Silakan coba lagi.';
      setError(errorMsg);
      setSessions([]);
      setTotalSessions(0);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(totalSessions / pageSize);
  
  // Client-side filtering for search and status
  const filteredSessions = sessions.filter((session) => {
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        (session.subject || '').toLowerCase().includes(query) ||
        (session.classroom_name || '').toLowerCase().includes(query) ||
        (session.title || '').toLowerCase().includes(query);
      
      if (!matchesSearch) return false;
    }

    // Filter by status
    if (statusFilter !== 'all') {
      const sessionStatus = (session.status || '').toLowerCase();
      const filterStatus = statusFilter.toLowerCase();
      if (sessionStatus !== filterStatus) return false;
    }

    return true;
  });

  return (
    <div className="teacher-sessions-container">
      <div className="teacher-sessions-header">
        <div>
          <h2 className="teacher-sessions-title">Riwayat Sesi Mengajar</h2>
          <p className="teacher-sessions-subtitle">
            {teacherName ? `Sesi mengajar untuk ${teacherName}` : 'Daftar semua sesi mengajar'}
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            className="teacher-sessions-close-btn"
            onClick={onClose}
            aria-label="Tutup riwayat sesi"
          >
            ✕
          </button>
        )}
      </div>

      <div className="teacher-sessions-filters">
        <div className="teacher-sessions-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Cari berdasarkan mata pelajaran atau kelas..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="teacher-sessions-search-input"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="teacher-sessions-filter-select"
        >
          <option value="all">Semua Status</option>
          <option value="ongoing">Berlangsung</option>
          <option value="finished">Selesai</option>
          <option value="cancelled">Dibatalkan</option>
        </select>
      </div>

      <div className="teacher-sessions-content">
        {loading && (
          <div className="teacher-sessions-loading">
            <Loader size={24} className="spinner" />
            <p>Memuat riwayat sesi...</p>
          </div>
        )}

        {!loading && error && (
          <div className="teacher-sessions-error">
            <AlertCircle size={20} />
            <p>{error}</p>
            <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '8px' }}>
              Guru ID: {teacherId}
            </span>
            <button
              type="button"
              onClick={() => fetchSessions()}
              className="btn-secondary"
              style={{ marginTop: '12px' }}
            >
              Coba Lagi
            </button>
          </div>
        )}

        {!loading && !error && filteredSessions.length === 0 && (
          <div className="teacher-sessions-empty">
            <BookOpen size={40} />
            <p>Belum ada riwayat sesi untuk guru ini</p>
            <span className="teacher-sessions-empty-hint">
              Sesi baru akan ditampilkan di sini setelah dibuat
            </span>
          </div>
        )}

        {!loading && !error && filteredSessions.length > 0 && (
          <div className="teacher-sessions-list">
            {filteredSessions.map((session) => (
              <div key={session.session_id} className="teacher-session-card">
                <div className="teacher-session-card-header">
                  <div className="teacher-session-card-title">
                    <h3>{session.subject || 'Tanpa Judul'}</h3>
                    <span className={`teacher-session-status teacher-session-status--${session.status || 'unknown'}`}>
                      {session.status === 'ONGOING' && 'Berlangsung'}
                      {session.status === 'FINISHED' && 'Selesai'}
                      {session.status === 'CANCELLED' && 'Dibatalkan'}
                      {!['ONGOING', 'FINISHED', 'CANCELLED'].includes(session.status) && (session.status || 'Tidak Diketahui')}
                    </span>
                  </div>
                </div>

                <div className="teacher-session-card-details">
                  <div className="teacher-session-detail-row">
                    <span className="teacher-session-detail-label">
                      <Users size={16} /> Kelas
                    </span>
                    <span className="teacher-session-detail-value">
                      {session.classroom_name || '-'}
                    </span>
                  </div>

                  <div className="teacher-session-detail-row">
                    <span className="teacher-session-detail-label">
                      <Calendar size={16} /> Tanggal
                    </span>
                    <span className="teacher-session-detail-value">
                      {formatDate(session.start_time)}
                    </span>
                  </div>

                  <div className="teacher-session-detail-row">
                    <span className="teacher-session-detail-label">
                      <Clock size={16} /> Waktu
                    </span>
                    <span className="teacher-session-detail-value">
                      {formatTime(session.start_time)} - {formatTime(session.end_time)}
                    </span>
                  </div>

                  {session.metrics && (
                    <div className="teacher-session-metrics">
                      <div className="teacher-session-metric-item">
                        <span className="teacher-session-metric-label">Siswa Aktif</span>
                        <span className="teacher-session-metric-value">
                          {Math.round(session.metrics.active_students || 0)}
                        </span>
                      </div>
                      <div className="teacher-session-metric-item">
                        <span className="teacher-session-metric-label">Fokus</span>
                        <span className="teacher-session-metric-value">
                          {(session.metrics.focus_percentage || 0).toFixed(1)}%
                        </span>
                      </div>
                      <div className="teacher-session-metric-item">
                        <span className="teacher-session-metric-label">Angkat Tangan</span>
                        <span className="teacher-session-metric-value">
                          {session.metrics.raised_hand_count || 0}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {!loading && !error && filteredSessions.length > 0 && totalPages > 1 && (
        <div className="teacher-sessions-pagination">
          <span className="teacher-sessions-pagination-info">
            Halaman {page} dari {totalPages} — {totalSessions} total sesi
          </span>
          <div className="teacher-sessions-pagination-controls">
            <button
              type="button"
              className="teacher-sessions-pagination-btn"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              aria-label="Halaman sebelumnya"
            >
              <ChevronLeft size={16} /> Sebelumnya
            </button>
            <button
              type="button"
              className="teacher-sessions-pagination-btn"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              aria-label="Halaman berikutnya"
            >
              Berikutnya <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
