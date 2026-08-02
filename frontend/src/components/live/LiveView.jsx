export default function LiveView({
  imgRef,
  canvasRef,
  streamUrl,
  streamError,
  streamLoading,
  onStreamLoaded,
  onStreamFailed,
  liveLog,
  sessions,
  selectedStreamSessionId,
  onSelectStreamSession,
  selectedStreamSession,
  onStartStream,
  onStopStream,
}) {
  return (
    <div className="view-panel">
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
          {!streamUrl && !streamError && (
            <p style={{ marginTop: '12px', color: '#475569' }}>
              Tekan tombol <strong>Mulai Stream</strong> untuk memulai aliran backend. Jika Anda ingin RTSP external, backend perlu diubah lagi.
            </p>
          )}
        </div>

        <div className="camera-result-card">
          <div className="card-header" style={{ marginBottom: '16px' }}>
            <div>
              <h2 className="card-title" style={{ fontSize: '1rem' }}>Classroom AI Detection Result</h2>
              <p className="card-subtitle">Status atensi real-time terdeteksi kamera</p>
            </div>
          </div>

          <div className="result-list">
            {liveLog.length > 0 ? (
              liveLog.map((result, index) => (
                <div className="result-item" key={`${result.name}-${index}`}>
                  <span className="result-student-name">{result.name}</span>
                  <span className={`badge ${result.status === 'Attentive' ? 'badge-aktif' : 'badge-tidak-aktif'}`}>
                    {result.status}
                  </span>
                </div>
              ))
            ) : (
              <div style={{ color: '#64748b', fontSize: '0.92rem' }}>
                Belum ada data live dari backend.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="stream-control-card">
        <div style={{ display: 'grid', gap: '18px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ fontWeight: 600, color: '#cbd5e1' }}>Pilih Sesi untuk Stream:</label>
            <select
              value={selectedStreamSessionId}
              onChange={(event) => onSelectStreamSession(event.target.value)}
              style={{ width: '100%', maxWidth: '480px', padding: '12px 14px', borderRadius: '14px', border: '1px solid #334155', background: '#0b1220', color: '#f8fafc' }}
            >
              <option value="">Pilih sesi</option>
              {sessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.subject
                    ? `${session.subject} — ${session.classroom_name || session.camera_name || session.id}`
                    : session.id}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              className="btn-primary"
              onClick={() => selectedStreamSessionId && onStartStream(selectedStreamSessionId)}
              disabled={!selectedStreamSessionId || streamLoading}
            >
              {streamLoading ? 'Memulai...' : 'Mulai Stream'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={onStopStream}
              disabled={!streamUrl && !streamError}
            >
              Hentikan Stream
            </button>
          </div>

          {streamError && <p role="alert" style={{ color: '#f8d7da', margin: 0 }}>{streamError}</p>}
          {!streamUrl && !streamError && (
            <p style={{ margin: 0, color: '#94a3b8' }}>
              Tekan tombol <strong>Mulai Stream</strong> untuk memulai aliran backend.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
