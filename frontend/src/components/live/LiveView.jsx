import { detectionLabel } from '../../imports';

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
          {!streamUrl && !streamError && (
            <p style={{ marginTop: '12px', color: '#475569' }}>
              Tekan tombol <strong>Mulai Stream</strong> untuk memulai aliran video.
            </p>
          )}
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
            <label style={{ fontWeight: 600, color: '#cbd5e1' }}>Pilih Sesi untuk Stream:</label>
            <select
              value={selectedStreamSessionId}
              onChange={(event) => onSelectStreamSession(event.target.value)}
              style={{ width: '100%', maxWidth: '480px', padding: '12px 14px', borderRadius: '14px', border: '1px solid #334155', background: '#0b1220', color: '#f8fafc' }}
            >
              <option value="">Pilih sesi</option>
                {sessions
                  .filter((session) => session.status === "ONGOING")
                  .map((session) => (
                      <option key={session.id} value={session.id}>
                        {session.subject
                          ? `${session.subject} — ${session.classroom_name || session.camera_name || session.id} - ${session.status}`
                          : session.id}
                      </option>
                    )
                  )
                }
            </select>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* TOMBOL PINTAR (SMART BUTTON) */}
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

            {/* TOMBOL STOP */}
            <button
              type="button"
              className="btn-secondary"
              onClick={onStopStream}
              disabled={!streamUrl && !streamError && !isDemoActive}
            >
              Hentikan
            </button>
          </div>

          {streamError && <p role="alert" style={{ color: '#f8d7da', margin: 0 }}>{streamError}</p>}
          {!streamUrl && !streamError && (
            <p style={{ margin: 0, color: '#94a3b8' }}>
                Tekan <strong>Mulai Stream</strong> untuk RTSP, atau <strong>Gunakan Webcam</strong> untuk demo menggunakan laptop ini.
            </p>
          )}
          </div>
        </div>
      </div>
  );
}
