import { XCircle } from '../../imports';

/**
 * Generic modal shell used by every form/detail popup in the app.
 */
export default function Modal({ id, title, subtitle, onClose, wide = true, closeLabel, children }) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className={`modal-card ${wide ? 'modal-card--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h3 id={id} className="modal-title">{title}</h3>
            {subtitle && <p className="modal-subtitle">{subtitle}</p>}
          </div>
          <button type="button" className="modal-close" aria-label={closeLabel || `Tutup ${title}`} onClick={onClose}>
            <XCircle size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
