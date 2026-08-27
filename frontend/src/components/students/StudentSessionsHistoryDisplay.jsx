import { useState, useEffect, AlertCircle, Clock, Loader, User, getStudentSessions } from '../../imports';

/** focus_score & distracted_score berupa hitungan frame, bukan persen. */
const focusPercentage = (metrics = {}) => {
  const focus = Number(metrics.focus_score ?? 0);
  const distracted = Number(metrics.distracted_score ?? 0);
  const total = focus + distracted;
  return total > 0 ? Math.round((focus / total) * 100) : 0;
};

const formatDate = (timestamp) => {
  if (!timestamp) return '-';
  const parsedTime = new Date(timestamp);
  if (Number.isNaN(parsedTime.getTime())) return '-';
  return parsedTime.toLocaleDateString('id-ID', {
    dateStyle: 'medium',
  });
};

const formatTime = (timestamp) => {
  if (!timestamp) return '-';
  const parsedTime = new Date(timestamp);
  if (Number.isNaN(parsedTime.getTime())) return '-';
  return parsedTime.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function StudentSessionsHistoryDisplay({
  studentId,
  authToken,
}) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSessions();
  }, [studentId]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!studentId) {
        setError('Student ID tidak valid');
        setLoading(false);
        return;
      }

      const params = {
        page: 1,
        size: 100,
      };

      const response = await getStudentSessions(studentId, authToken, params);
      
      const items = Array.isArray(response?.items) ? response.items : [];
      setSessions(items);
    } catch (err) {
      console.error('Fetch student sessions error:', err);
      const errorMsg = err.message || 'Gagal memuat riwayat sesi siswa.';
      setError(errorMsg);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', minHeight: '200px' }}>
        <Loader size={20} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
        <span>Memuat riwayat sesi...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#991b1b', backgroundColor: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', minHeight: '100px' }}>
        <AlertCircle size={20} />
        <span>{error}</span>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', minHeight: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Belum ada riwayat sesi untuk siswa ini.
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: '10px' }}>
      {sessions.map((s) => (
        <div key={s.session_id} style={{ padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', backgroundColor: '#f8fafc' }}>
          <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#1e293b', marginBottom: '4px' }}>{s.subject || 'Tanpa Judul'}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#64748b', marginBottom: '6px' }}>
            <User size={14} />
            <span>{s.teacher_name || 'Guru tidak diketahui'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>
            <Clock size={14} />
            <span>{formatDate(s.start_time)} {formatTime(s.start_time)}</span>
          </div>
          {s.metrics && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #e2e8f0' }}>
              <div style={{ textAlign: 'center', fontSize: '0.75rem' }}>
                <div style={{ color: '#3b82f6', fontWeight: 600 }}>{focusPercentage(s.metrics)}%</div>
                <div style={{ color: '#64748b' }}>Fokus</div>
              </div>
              <div style={{ textAlign: 'center', fontSize: '0.75rem' }}>
                <div style={{ color: '#f59e0b', fontWeight: 600 }}>{s.metrics.distracted_score ?? 0}</div>
                <div style={{ color: '#64748b' }}>Terdistraksi</div>
              </div>
              <div style={{ textAlign: 'center', fontSize: '0.75rem' }}>
                <div style={{ color: '#10b981', fontWeight: 600 }}>{s.metrics.raised_hand_count || 0}</div>
                <div style={{ color: '#64748b' }}>Tangan</div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
