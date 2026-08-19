import { useEffect, useRef } from 'react';
import { Bell, AlertTriangle } from 'lucide-react';
import '../../styles/notifications.css';

const formatTime = (date) =>
  date instanceof Date && !Number.isNaN(date.getTime())
    ? date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    : '-';

export default function NotificationBell({
  notifications = [],
  unreadCount = 0,
  isPanelOpen = false,
  onToggle,
  onClose,
  onClear,
}) {
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!isPanelOpen) return undefined;
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        onClose?.();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isPanelOpen, onClose]);

  return (
    <div className="notif-wrapper" ref={wrapperRef}>
      <button
        type="button"
        className={`notif-bell${unreadCount > 0 ? ' has-unread' : ''}`}
        onClick={onToggle}
        title="Notifikasi"
        aria-label="Notifikasi"
      >
        <Bell size={19} />
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {isPanelOpen && (
        <div className="notif-panel">
          <div className="notif-panel-header">
            <span>Notifikasi</span>
            {notifications.length > 0 && (
              <button type="button" className="notif-panel-clear" onClick={onClear}>
                Bersihkan
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="notif-empty">Belum ada notifikasi.</div>
          ) : (
            notifications.map((item) => (
              <div className="notif-item" key={item.id}>
                <AlertTriangle size={16} className="notif-item-icon" />
                <div>
                  <div className="notif-item-title">{item.title}</div>
                  <div className="notif-item-message">{item.message}</div>
                  <div className="notif-item-time">{formatTime(item.receivedAt)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
