import { useEffect, useState } from '../imports';

/**
 * Global UI shell state: active tab, search query and table filters.
 */
export function useUiState(currentUser) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    // Teacher tidak memiliki akses ke tab siswa, alihkan ke daftar sesi.
    if (currentUser?.role === 'teacher' && activeTab === 'students') {
      setActiveTab('sessions');
    }
  }, [currentUser?.role, activeTab]);

  return {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    classFilter,
    setClassFilter,
    statusFilter,
    setStatusFilter,
  };
}

export default useUiState;
