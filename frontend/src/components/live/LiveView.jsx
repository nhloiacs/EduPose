import { detectionLabel, Video } from '../../imports';
import '../../styles/streamControl.css';

export default function LiveView({
  imgRef,
  canvasRef,
  hiddenVideoRef,      // <--- Props baru
  isDemoActive,        // <--- Props baru
  liveLog,
  detectedPeople,
  detectionStreamActive,
  detectionError,
  streamUrl,
  streamError,
  streamLoading,
  onStreamLoaded,
  onStreamFailed,
  sessions,
  selectedStreamSessionId,
  onSelectStreamSession,
  selectedStreamSession,
  onStartStream,
  onStartDemoWebcam,   // <--- Props baru
  onStopStream,
}) {
  const ongoingSessions = (sessions || []).filter((session) => session.status === 'ONGOING');
  const isStreaming = Boolean(streamUrl) || isDemoActive;

  return (
    <div className="view-panel">
      {/* Video tersembunyi untuk nyedot webcam laptop */}
      <video 
        ref={hiddenVideoRef} 
        muted 
        playsInline 
        style={{ 
          position: 'absolute', 
          opacity: 0, 
          pointerEvents: 'none', 
          width: '1px', 
          height: '1px' 
        }} 
      />

      <div className="live-container">

        <div className="live-feed-card">
          <div className="live-feed-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} />
              <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Live Camera Feed</span>
            </div>
            <span className="live-badge">🔴 Live</span>
          </div>

          <div className="live-feed-video-wrapper">
            {streamUrl ? (
              <>
                <img
                  ref={imgRef}
                  src={streamUrl}
                  alt="Classroom Live Stream"
                  className="classroom-img"
                  onLoad={onStreamLoaded}
                  onError={onStreamFailed}
                />
                <canvas ref={canvasRef} className="canvas-overlay" />
              </>
            ) : (
              <div className="live-placeholder">
                <strong>Tidak ada tampilan kamera aktif.</strong>
                <p>Pilih sesi di bawah lalu tekan <strong>Mulai Stream</strong> untuk melihat live feed.</p>
              </div>
            )}
          </div>

          {selectedStreamSession && (
            <div className="stream-session-status">
              <span>Status sesi:</span>
              <strong>{selectedStreamSession.status ? selectedStreamSession.status.toUpperCase() : 'UNKNOWN'}</strong>
            </div>
          )}

          {streamError && <p role="alert" style={{ color: '#b91c1c', marginTop: '12px' }}>{streamError}</p>}
          
        </div>

        <div className="camera-result-card">
          <div className="card-header" style={{ marginBottom: '16px' }}>
            <div>
              <h2 className="card-title" style={{ fontSize: '1rem' }}>Hasil Deteksi Kamera</h2>
              <p className="card-subtitle">
                {streamUrl
                  ? `${detectedPeople} orang terdeteksi di frame terakhir`
                  : 'Status atensi real-time terdeteksi kamera'}
              </p>
            </div>
          </div>

          <div className="result-list">
            {!streamUrl ? (
              <div style={{ color: '#64748b', fontSize: '0.92rem' }}>
                Mulai stream untuk melihat hasil deteksi.
              </div>
            ) : detectionError ? (
              <div
                role="alert"
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  background: '#fef2f2',
                  border: '1px solid #fca5a5',
                  color: '#b91c1c',
                  fontSize: '0.88rem',
                }}
              >
                <strong style={{ display: 'block', marginBottom: '4px' }}>
                  Hasil deteksi tidak dapat diambil
                </strong>
                {detectionError}
              </div>
            ) : !detectionStreamActive ? (
              <div style={{ color: '#64748b', fontSize: '0.92rem' }}>
                Video berjalan, tetapi sistem melaporkan stream kamera belum aktif.
                Coba hentikan lalu mulai ulang stream.
              </div>
            ) : liveLog.length > 0 ? (
              liveLog.map((result) => {
                const badgeClass = result.label === 'focus' ? 'badge-aktif' : 'badge-tidak-aktif';

                return (
                  <div className="result-item" key={result.id}>
                    <span className="result-student-name">{result.name}</span>
                    <span className={`badge ${badgeClass}`}>
                      {detectionLabel(result.label)}
                      {result.confidence ? ` ${Math.round(result.confidence * 100)}%` : ''}
                    </span>
                  </div>
                );
              })
            ) : (
              <div style={{ color: '#64748b', fontSize: '0.92rem' }}>
                Belum ada siswa yang diabsen pada sesi ini, sehingga deteksi belum
                bisa dicocokkan ke nama siswa.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="stream-control-card">
        <div style={{ display: 'grid', gap: '18px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span className="stream-control-label">Pilih sesi untuk stream</span>
            <div className="session-picker">
              {ongoingSessions.length === 0 ? (
                <div className="session-picker-empty">
                  Tidak ada sesi yang sedang berlangsung.
                </div>
              ) : (
                ongoingSessions.map((session) => (
                  <button
                    type="button"
                    key={session.id}
                    className={`session-option${selectedStreamSessionId === session.id ? ' is-selected' : ''}`}
                    onClick={() => onSelectStreamSession(session.id)}
                    disabled={isStreaming || streamLoading}
                  >
                    <span className="session-option-icon">
                      <Video size={18} />
                    </span>
                    <span className="session-option-info">
                      <span className="session-option-title">
                        {session.subject || 'Tanpa mata pelajaran'}
                      </span>
                      <span className="session-option-meta">
                        {session.classroom_name || session.camera_name || session.id}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            {isStreaming ? (
              <button type="button" className="btn-secondary" onClick={onStopStream}>
                Hentikan Stream
              </button>
            ) : (
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  if (selectedStreamSessionId && selectedStreamSession) {
                    onStartStream(selectedStreamSessionId, selectedStreamSession);
                  }
                }}
                disabled={!selectedStreamSessionId || streamLoading}
              >
                {streamLoading ? 'Memulai...' : 'Mulai Stream'}
              </button>
            )}

            {isStreaming && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#b91c1c', fontWeight: 600, fontSize: '0.85rem' }}>
                <span className="stream-live-dot" />
                Stream sedang berjalan
              </span>
            )}
          </div>

          {streamError && <p role="alert" style={{ color: '#b91c1c', margin: 0 }}>{streamError}</p>}
          {!isStreaming && !streamError && (
            <p className="stream-control-hint">
              Pilih salah satu sesi di atas, lalu tekan <strong>Mulai Stream</strong>.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
