import { API_BASE_URL } from '../lib/backendApi';

export const formatAlertTime = (timestamp) => {
  if (!timestamp) return 'Baru saja';

  const parsedTime = new Date(timestamp);
  if (Number.isNaN(parsedTime.getTime())) return 'Baru saja';

  return parsedTime.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatDateTimeLabel = (timestamp) => {
  if (!timestamp) return '-';

  const parsedTime = new Date(timestamp);
  if (Number.isNaN(parsedTime.getTime())) return '-';

  return parsedTime.toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

export const formatMetricValue = (value) => {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return '-';
  }
  return Number(value).toLocaleString('id-ID', { maximumFractionDigits: 2 });
};

export const formatClockLabel = (date) => {
  if (!date) return '-';
  const parsed = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

export const resolveAssetUrl = (path) => {
  if (!path || typeof path !== 'string') return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};
