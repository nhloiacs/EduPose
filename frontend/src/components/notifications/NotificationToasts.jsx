import { AlertTriangle, X } from 'lucide-react';
import '../../styles/notifications.css';

export default function NotificationToasts({ toasts = [], onDismiss }) {
  if (!toasts.length) return null;

  return (
    <div className="notif-toast-stack">
      {toasts.map((item) => (
        <div
          key={item.id}
          className={`notif-toast${item.type === 'ALERT' ? ' notif-toast-alert' : ''}`}
        >
          <AlertTriangle size={18} className="notif-toast-icon" />
          <div>
            <div className="notif-toast-title">{item.title}</div>
            <div className="notif-toast-message">{item.message}</div>
          </div>
          <button
            type="button"
            className="notif-toast-close"
            onClick={() => onDismiss?.(item.id)}
            aria-label="Tutup notifikasi"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
