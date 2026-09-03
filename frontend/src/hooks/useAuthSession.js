import {
  useEffect,
  useState,
  clearStoredSession,
  loginRequest,
  persistSession,
  readStoredSession,
  setApiAuthToken,
} from '../imports';

/**
 * Owns authentication token, current user, login form and global sync messaging.
 */
export function useAuthSession() {
  const storedSession = readStoredSession();

  const [authToken, setAuthToken] = useState(storedSession.token);
  const [currentUser, setCurrentUser] = useState(storedSession.user);
  const [syncState, setSyncState] = useState(storedSession.token ? 'loading' : 'idle');
  const [backendMessage, setBackendMessage] = useState(
    storedSession.token ? 'Mencoba sinkronisasi data sistem...' : 'Belum login ke sistem',
  );
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [loginError, setLoginError] = useState('');
  const [loginForm, setLoginForm] = useState({ email: 'bambang@school.com', password: 'password123' });

  useEffect(() => {
    setApiAuthToken(authToken);
  }, [authToken]);

  const handleLoginSubmit = async (event) => {
    event.preventDefault();
    setLoginError('');
    setSyncState('loading');
    setBackendMessage('Login ke sistem...');

    try {
      const response = await loginRequest(loginForm.email.trim(), loginForm.password);
      const sessionUser = response.data ?? null;
      const token = sessionUser?.token ?? '';

      if (!token) {
        throw new Error('Token login tidak ditemukan.');
      }

      persistSession({ token, user: sessionUser });
      setAuthToken(token);
      setCurrentUser(sessionUser);
      setLoginForm((previousForm) => ({ ...previousForm, password: '' }));
      setBackendMessage(`${response.message || 'Login berhasil'}. Menyinkronkan data sistem...`);
      return true;
    } catch (error) {
      setSyncState('error');
      setBackendMessage('Login gagal');
      setLoginError(error instanceof Error ? error.message : 'Login gagal');
      return false;
    }
  };

  const handleLogout = () => {
    clearStoredSession();
    setAuthToken('');
    setCurrentUser(null);
    setSyncState('idle');
    setBackendMessage('Belum login ke sistem');
    setLastSyncedAt(null);
  };

  return {
    authToken,
    currentUser,
    setCurrentUser,
    isPrincipalUser: currentUser?.role === 'principal',
    isTeacherUser: currentUser?.role === 'teacher',
    syncState,
    setSyncState,
    backendMessage,
    setBackendMessage,
    lastSyncedAt,
    setLastSyncedAt,
    loginForm,
    setLoginForm,
    loginError,
    handleLoginSubmit,
    handleLogout,
  };
}

export default useAuthSession;
