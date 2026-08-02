import { useEffect, useState, checkBackendHealth } from '../imports';

/**
 * Polls the backend health endpoint once on mount.
 */
export function useBackendHealth() {
  const [backendHealthState, setBackendHealthState] = useState('checking');
  const [backendHealthMessage, setBackendHealthMessage] = useState('Memeriksa backend...');

  useEffect(() => {
    let isActive = true;

    const verifyBackendHealth = async () => {
      setBackendHealthState('checking');
      setBackendHealthMessage('Memeriksa backend...');

      try {
        await checkBackendHealth();
        if (!isActive) return;
        setBackendHealthState('online');
        setBackendHealthMessage('Backend aktif');
      } catch (error) {
        if (!isActive) return;
        setBackendHealthState('offline');
        setBackendHealthMessage(
          error instanceof Error ? error.message : 'Backend tidak dapat dijangkau',
        );
      }
    };

    verifyBackendHealth();
    return () => { isActive = false; };
  }, []);

  return { backendHealthState, backendHealthMessage };
}

export default useBackendHealth;
