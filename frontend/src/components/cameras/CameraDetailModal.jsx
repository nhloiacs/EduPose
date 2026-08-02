import { Modal, formatDateTimeLabel } from '../../imports';

const DetailRow = ({ label, children }) => (
  <div className="modal-detail-row">
    <span className="modal-detail-label">{label}</span>
    <span className="modal-detail-value">{children}</span>
  </div>
);

export default function CameraDetailModal({
  isOpen,
  cameraDetail,
  cameraDetailLoading,
  cameraDetailError,
  onClose,
}) {
  if (!isOpen) return null;

  return (
    <Modal
      id="camera-detail-modal-title"
      title="Detail Kamera"
      subtitle="Informasi kamera lengkap sesuai endpoint detail."
      closeLabel="Tutup detail kamera"
      onClose={onClose}
    >
      {cameraDetailLoading && (
        <div style={{ padding: '20px', color: '#64748b' }}>Memuat detail kamera...</div>
      )}
      {cameraDetailError && <p role="alert" style={{ color: '#b91c1c' }}>{cameraDetailError}</p>}
      {cameraDetail && !cameraDetailLoading && (
        <div className="modal-detail-card">
          <DetailRow label="ID">{cameraDetail.id || '-'}</DetailRow>
          <DetailRow label="Nama">{cameraDetail.name || '-'}</DetailRow>
          <DetailRow label="Endpoint">{cameraDetail.endpoint || '-'}</DetailRow>
          <DetailRow label="Status">{cameraDetail.status || '-'}</DetailRow>
          <DetailRow label="Last Ping">{formatDateTimeLabel(cameraDetail.last_ping_at)}</DetailRow>
          <DetailRow label="Dibuat pada">{formatDateTimeLabel(cameraDetail.created_at)}</DetailRow>
        </div>
      )}
    </Modal>
  );
}
