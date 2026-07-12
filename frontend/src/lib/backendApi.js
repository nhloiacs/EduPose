const DEFAULT_API_BASE_URL = '/api';

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL).replace(/\/$/, '');

export const AUTH_STORAGE_KEY = 'attentionai.auth.session';

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
};

export const clearStoredSession = () => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
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

export const apiRequest = async ({ path, method = 'GET', token, body, params, headers = {} }) => {
  const response = await fetch(buildApiUrl(path, params), {
    method,
    headers: {
      ...headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
  });

  const payload = await parseJson(response);

  if (!response.ok) {
    const errorMessage = payload?.message || payload?.detail || `Request failed with status ${response.status}`;
    throw new Error(errorMessage);
  }

  return payload;
};

export const loginRequest = (email, password) => {
  return apiRequest({
    path: '/auth/login',
    method: 'POST',
    body: { email, password },
    headers: {
      'Content-Type': 'application/json',
    },
  });
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
  });
};

const createFallbackMetrics = (index, fallbackStudents) => {
  const template = fallbackStudents[index % fallbackStudents.length] ?? fallbackStudents[0] ?? {};

  return {
    attention: typeof template.attention === 'number' ? template.attention : 75,
    emotion: template.emotion || 'Netral',
    status: template.status || 'Aktif',
    trend: template.trend || 'up',
  };
};

export const mergeStudentsFromBackend = (remoteStudents = [], fallbackStudents = []) => {
  if (!Array.isArray(remoteStudents) || remoteStudents.length === 0) {
    return fallbackStudents;
  }

  return remoteStudents.map((student, index) => {
    const metrics = createFallbackMetrics(index, fallbackStudents);

    return {
      id: student.id ?? index + 1,
      name: student.name || `Student ${index + 1}`,
      class: student.classroom_name || 'Belum ditentukan',
      attention: metrics.attention,
      emotion: metrics.emotion,
      status: metrics.status,
      trend: metrics.trend,
      nis: student.nis || '',
      classroom_id: student.classroom_id || '',
      photo_filepath: student.photo_filepath || null,
    };
  });
};

export const mergeBoxesFromStudents = (students = [], fallbackBoxes = []) => {
  if (!Array.isArray(students) || students.length === 0) {
    return fallbackBoxes;
  }

  return students.map((student, index) => {
    const seed = fallbackBoxes[index % fallbackBoxes.length] ?? {
      x: 10 + (index % 4) * 18,
      y: 10 + Math.floor(index / 4) * 28,
      w: 10,
      h: 16,
      focus: true,
      emotion: 'Netral',
    };

    const focus = typeof student.attention === 'number' ? student.attention >= 70 : seed.focus;

    return {
      ...seed,
      name: student.name || seed.name || `Student ${index + 1}`,
      emotion: student.emotion || seed.emotion || 'Netral',
      focus,
    };
  });
};

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
