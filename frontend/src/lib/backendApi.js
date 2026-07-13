const DEFAULT_API_BASE_URL = '/api';

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL).replace(/\/$/, '');

export const AUTH_STORAGE_KEY = 'attentionai.auth.session';

let activeAuthToken = '';

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const toQueryString = (params = {}) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    searchParams.set(key, String(value));
  });

  const query = searchParams.toString();
  return query ? `?${query}` : '';
};

export const buildApiUrl = (path, params) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}${params ? toQueryString(params) : ''}`;
};

export const setApiAuthToken = (token = '') => {
  activeAuthToken = typeof token === 'string' ? token.trim() : '';
};

export const getApiAuthToken = () => activeAuthToken;

export const readStoredSession = () => {
  if (typeof window === 'undefined') {
    return { token: '', user: null };
  }

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return { token: '', user: null };
    }

    const parsed = JSON.parse(raw);
    return {
      token: typeof parsed.token === 'string' ? parsed.token : '',
      user: parsed.user ?? null,
    };
  } catch {
    return { token: '', user: null };
  }
};

export const persistSession = (session) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  setApiAuthToken(session?.token ?? '');
};

export const clearStoredSession = () => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  setApiAuthToken('');
};

const parseJson = async (response) => {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

export const normalizeBaseResponse = (payload) => {
  if (!isPlainObject(payload)) {
    return {
      message: '',
      data: payload ?? null,
      raw: payload,
    };
  }

  return {
    message: typeof payload.message === 'string' ? payload.message : '',
    data: Object.prototype.hasOwnProperty.call(payload, 'data') ? payload.data ?? null : null,
    raw: payload,
  };
};

export const normalizePaginatedResponse = (payload) => {
  const baseResponse = normalizeBaseResponse(payload);
  const responseData = baseResponse.data;

  const items = Array.isArray(responseData?.items)
    ? responseData.items
    : Array.isArray(responseData)
      ? responseData
      : Array.isArray(baseResponse.raw?.items)
        ? baseResponse.raw.items
        : [];

  const metaSource = isPlainObject(responseData?.meta)
    ? responseData.meta
    : isPlainObject(baseResponse.raw?.meta)
      ? baseResponse.raw.meta
      : {};

  const total = Number(metaSource.total ?? items.length ?? 0);
  const page = Number(metaSource.page ?? 1);
  const size = Number(metaSource.size ?? items.length ?? 0);

  return {
    ...baseResponse,
    items,
    meta: {
      total: Number.isFinite(total) ? total : items.length,
      page: Number.isFinite(page) ? page : 1,
      size: Number.isFinite(size) ? size : items.length,
    },
  };
};

const applyRequestInterceptors = (config) => {
  const headers = { ...(config.headers ?? {}) };
  const resolvedToken = typeof config.token === 'string' && config.token.trim() ? config.token.trim() : activeAuthToken;

  if (!headers.Authorization && !config.skipAuth && resolvedToken) {
    headers.Authorization = `Bearer ${resolvedToken}`;
  }

  if (config.body !== undefined && !(config.body instanceof FormData) && !headers['Content-Type'] && !headers['content-type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (!headers.Accept && !headers.accept) {
    headers.Accept = 'application/json';
  }

  return {
    ...config,
    headers,
  };
};

export const apiRequest = async (config) => {
  const preparedConfig = applyRequestInterceptors(config);
  const response = await fetch(buildApiUrl(preparedConfig.path, preparedConfig.params), {
    method: preparedConfig.method ?? 'GET',
    headers: preparedConfig.headers,
    body: preparedConfig.body instanceof FormData
      ? preparedConfig.body
      : preparedConfig.body !== undefined
        ? JSON.stringify(preparedConfig.body)
        : undefined,
  });

  const payload = await parseJson(response);

  if (!response.ok) {
    const errorMessage = normalizeBaseResponse(payload).message || payload?.detail || `Request failed with status ${response.status}`;
    throw new Error(errorMessage);
  }

  return payload;
};

export const loginRequest = (email, password) => {
  return apiRequest({
    path: '/auth/login',
    method: 'POST',
    body: { email, password },
    skipAuth: true,
  }).then((payload) => normalizeBaseResponse(payload));
};

export const checkBackendHealth = async () => {
  const response = await fetch(buildApiUrl('/'));

  if (!response.ok) {
    throw new Error(`Backend health check failed with status ${response.status}`);
  }

  return response.json();
};

export const listCollection = (resourcePath, token, params = {}) => {
  return apiRequest({
    path: resourcePath,
    method: 'GET',
    token,
    params,
  }).then((payload) => normalizePaginatedResponse(payload));
};

export const getPaginatedCollection = (response) => normalizePaginatedResponse(response);

export const getBaseResponseData = (response) => normalizeBaseResponse(response).data;

export const getBaseResponseMessage = (response) => normalizeBaseResponse(response).message;

export const mergeStudentsFromBackend = (remoteStudents = []) => {
  if (!Array.isArray(remoteStudents) || remoteStudents.length === 0) {
    return [];
  }

  return remoteStudents.map((student, index) => ({
    id: student.id ?? index + 1,
    name: student.name || `Student ${index + 1}`,
    class: student.classroom_name || 'Belum ditentukan',
    attention: Number(student.attention ?? 0),
    emotion: student.emotion || 'Belum tersedia',
    status: student.status || 'Belum tersedia',
    trend: student.trend || 'flat',
    nis: student.nis || '',
    classroom_id: student.classroom_id || '',
    photo_filepath: student.photo_filepath || null,
  }));
};

export const mergeBoxesFromStudents = () => [];

export const buildTeacherProfile = (user, previousProfile) => {
  if (!user) {
    return previousProfile;
  }

  return {
    ...previousProfile,
    name: user.name || previousProfile.name,
    email: user.email || previousProfile.email,
    role: user.role || previousProfile.role,
    photoFilepath: user.photo_filepath || previousProfile.photoFilepath,
    avatarInitials: user.name
      ? user.name
          .split(' ')
          .filter(Boolean)
          .slice(0, 2)
          .map((part) => part[0]?.toUpperCase())
          .join('')
      : previousProfile.avatarInitials,
  };
};
