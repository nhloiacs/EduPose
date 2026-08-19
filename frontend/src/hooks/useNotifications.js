import { useCallback, useRef, useState } from 'react';

const MAX_NOTIFICATIONS = 50;
const TOAST_DURATION_MS = 8000;

/**
 * Menampung notifikasi/alert yang dikirim sistem lewat WebSocket
 * (endpoint backend: /stream/notifications/{session_id}).
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [isPanelOpen, setPanelOpen] = useState(false);
  const counterRef = useRef(0);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  /** payload: { type, title, message, distracted_count, timestamp } */
  const pushNotification = useCallback((payload = {}) => {
    counterRef.current += 1;
    const id = `notif-${counterRef.current}-${Date.now()}`;
    const item = {
      id,
      type: payload.type || 'INFO',
      title: payload.title || 'Notifikasi',
      message: payload.message || '',
      distractedCount: payload.distracted_count ?? null,
      receivedAt: payload.timestamp ? new Date(payload.timestamp * 1000) : new Date(),
      read: false,
    };

    setNotifications((prev) => [item, ...prev].slice(0, MAX_NOTIFICATIONS));
    setToasts((prev) => [item, ...prev].slice(0, 3));
    setTimeout(() => dismissToast(id), TOAST_DURATION_MS);

    return item;
  }, [dismissToast]);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const togglePanel = useCallback(() => {
    setPanelOpen((prev) => {
      if (!prev) markAllRead();
      return !prev;
    });
  }, [markAllRead]);

  const closePanel = useCallback(() => setPanelOpen(false), []);

  const unreadCount = notifications.filter((item) => !item.read).length;

  return {
    notifications,
    toasts,
    unreadCount,
    isPanelOpen,
    pushNotification,
    dismissToast,
    markAllRead,
    clearNotifications,
    togglePanel,
    closePanel,
  };
}

export default useNotifications;
