import {
  useEffect,
  useState,
  enrichStudentsWithPerformers,
  getAllTeachers,
  getAverageFocusFromMetrics,
  getDashboardMetrics,
  getDashboardSummary,
  getDashboardLiveWarnings,
  getDashboardWarnings,
  getDateRange,
  mapLiveWarnings,
  getTopPerformers,
  listCollection,
  mapClassroomRankings,
  mapStudentWarnings,
  mapTopPerformersToStudents,
  mergeBoxesFromStudents,
  mergeStudentsFromBackend,
  toMetricArray,
} from '../imports';

const REFRESH_INTERVAL_MS = 30000;

// Peringatan atensi diperbarui jauh lebih sering daripada data dashboard lain
// karena bersumber dari deteksi kamera yang berjalan tiap 5 detik.
const LIVE_WARNING_INTERVAL_MS = 4000;

// Rentang cadangan bila rentang terpilih belum menghasilkan data sama sekali.
const FALLBACK_RANGE_DAYS = [7, 30, 90, 365];

/**
 * Loads and periodically refreshes every dashboard dataset, then fans the results
 * out to the domain hooks that own the related collections.
 */
export function useDashboardData({
  authToken,
  currentUser,
  setSyncState,
  setBackendMessage,
  setLastSyncedAt,
  setSessions,
  setTeachers,
  setBackendClassrooms,
  setBoxes,
  topClassroomFallback = [],
}) {
  const [students, setStudents] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [dashboardSummary, setDashboardSummary] = useState(null);
  const [dailyMetrics, setDailyMetrics] = useState([]);
  const [weeklyMetrics, setWeeklyMetrics] = useState([]);
  const [metricsByGranularity, setMetricsByGranularity] = useState({ daily: [], weekly: [], monthly: [] });
  const [topClassroomRankings, setTopClassroomRankings] = useState([]);
  const [topStudentPerformers, setTopStudentPerformers] = useState([]);
  const [liveWarnings, setLiveWarnings] = useState([]);
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [metricsRangeDays, setMetricsRangeDays] = useState(7);
  const [metricsRangeUsed, setMetricsRangeUsed] = useState(7);
  const [metricsError, setMetricsError] = useState('');

  // Peringatan real-time dari kamera pada sesi yang sedang berlangsung.
  useEffect(() => {
    if (!authToken) return undefined;

    let isActive = true;

    const loadLiveWarnings = async () => {
      try {
        const response = await getDashboardLiveWarnings(authToken);
        if (!isActive) return;

        const data = response.data ?? {};
        setHasActiveSession(Boolean(data.has_active_session));
        setLiveWarnings(mapLiveWarnings(data.students));
      } catch {
        if (!isActive) return;
        // Endpoint live gagal: panel otomatis kembali ke data historis.
        setHasActiveSession(false);
        setLiveWarnings([]);
      }
    };

    loadLiveWarnings();
    const intervalId = setInterval(loadLiveWarnings, LIVE_WARNING_INTERVAL_MS);

    return () => { isActive = false; clearInterval(intervalId); };
  }, [authToken]);

  useEffect(() => {
    let isActive = true;

    const loadBackendData = async (showLoadingState = true) => {
      if (!authToken) {
        if (!isActive) return;
        setSyncState('idle');
        setBackendMessage('Belum login ke sistem');
        return;
      }

      if (showLoadingState) {
        setSyncState('loading');
        setBackendMessage('Mengambil statistik, chart, dan tabel dari backend...');
      }

      const weeklyRange = getDateRange(28);
      const isPrincipalUser = currentUser?.role === 'principal';

      // Grafik harian diambil terpisah supaya bisa melebarkan rentang tanggal
      // secara otomatis ketika rentang terpilih belum menghasilkan data.
      const dailyMetricsPromise = (async () => {
        const candidateRanges = [
          metricsRangeDays,
          ...FALLBACK_RANGE_DAYS.filter((days) => days > metricsRangeDays),
        ];

        let lastResult = { items: [], days: metricsRangeDays };

        for (const days of candidateRanges) {
          const response = await getDashboardMetrics(authToken, {
            granularity: 'daily',
            ...getDateRange(days),
          });
          const items = toMetricArray(response);
          lastResult = { items, days };
          if (items.length > 0) break;
        }

        return lastResult;
      })();

      const dashboardRequests = [
        getDashboardSummary(authToken),
        dailyMetricsPromise,
        getDashboardMetrics(authToken, { granularity: 'weekly', ...weeklyRange }),
        getTopPerformers(authToken, 'classroom', { limit: 10, sort_by: 'focus' }),
        // Backend membatasi limit top performer hingga 50 item.
        getTopPerformers(authToken, 'student', { limit: 50, sort_by: 'focus' }),
        getDashboardWarnings(authToken, 'student', { threshold: 60 }),
      ];

      const sessionRequests = [
        listCollection('/classroom-sessions', authToken, { page: 1, size: 10 }),
      ];

      const collectionRequests = isPrincipalUser
        ? [
          listCollection('/students', authToken, { page: 1, size: 100 }),
          listCollection('/classrooms', authToken, { page: 1, size: 100 }),
          getAllTeachers(authToken, { page: 1, size: 100 }),
        ]
        : [];

      try {
        const [
          summaryResult,
          dailyMetricsResult,
          weeklyMetricsResult,
          topClassroomsResult,
          topStudentsResult,
          warningsResult,
          sessionsResult,
          ...collectionResults
        ] = await Promise.allSettled([...dashboardRequests, ...sessionRequests, ...collectionRequests]);

        if (!isActive) return;

        const partialErrors = [];

        if (summaryResult.status === 'fulfilled') {
          setDashboardSummary(summaryResult.value.data ?? null);
        } else {
          partialErrors.push('statistik dashboard');
        }

        if (dailyMetricsResult.status === 'fulfilled') {
          const daily = dailyMetricsResult.value.items;
          setDailyMetrics(daily);
          setMetricsRangeUsed(dailyMetricsResult.value.days);
          setMetricsError('');
          setMetricsByGranularity((previous) => ({ ...previous, daily }));
        } else {
          partialErrors.push('grafik harian');
          setMetricsError(
            dailyMetricsResult.reason instanceof Error
              ? dailyMetricsResult.reason.message
              : 'Gagal mengambil data /dashboard/metrics.',
          );
        }

        if (weeklyMetricsResult.status === 'fulfilled') {
          const weekly = toMetricArray(weeklyMetricsResult.value);
          setWeeklyMetrics(weekly);
          setMetricsByGranularity((previous) => ({ ...previous, weekly }));
        } else {
          partialErrors.push('grafik mingguan');
        }

        if (topClassroomsResult.status === 'fulfilled') {
          setTopClassroomRankings(Array.isArray(topClassroomsResult.value.data) ? topClassroomsResult.value.data : []);
        } else {
          partialErrors.push('peringkat kelas');
        }

        let performers = [];
        if (topStudentsResult.status === 'fulfilled') {
          performers = Array.isArray(topStudentsResult.value.data) ? topStudentsResult.value.data : [];
          setTopStudentPerformers(performers);
        } else {
          partialErrors.push('data siswa');
        }

        if (warningsResult.status === 'fulfilled') {
          const warningItems = Array.isArray(warningsResult.value.data) ? warningsResult.value.data : [];
          setWarnings(mapStudentWarnings(warningItems));
        } else {
          partialErrors.push('peringatan');
        }

        if (sessionsResult.status === 'fulfilled') {
          setSessions(Array.isArray(sessionsResult.value.items) ? sessionsResult.value.items : []);
        } else {
          partialErrors.push('daftar sesi');
        }

        let nextStudents = mapTopPerformersToStudents(performers);
        let remoteClassrooms = topClassroomFallback;
        let remoteTeachers = [];

        const [studentsResponseResult, classroomsResponseResult, teachersResponseResult] = collectionResults;

        if (studentsResponseResult?.status === 'fulfilled') {
          nextStudents = enrichStudentsWithPerformers(
            mergeStudentsFromBackend(studentsResponseResult.value.items),
            performers,
          );
        } else if (studentsResponseResult?.status === 'rejected') {
          partialErrors.push('daftar siswa');
        }

        if (classroomsResponseResult?.status === 'fulfilled') {
          remoteClassrooms = classroomsResponseResult.value.items;
          setBackendClassrooms(remoteClassrooms);
        } else if (classroomsResponseResult?.status === 'rejected') {
          partialErrors.push('daftar kelas');
        }

        if (teachersResponseResult?.status === 'fulfilled') {
          const items = Array.isArray(teachersResponseResult.value.data?.items)
            ? teachersResponseResult.value.data.items
            : [];
          remoteTeachers = items;
          setTeachers(remoteTeachers);
        } else if (teachersResponseResult?.status === 'rejected') {
          partialErrors.push('daftar guru');
        }

        setStudents(nextStudents);
        setBoxes(mergeBoxesFromStudents(nextStudents));
        setLastSyncedAt(new Date());

        const summaryData = summaryResult.status === 'fulfilled'
          ? (summaryResult.value.data ?? {})
          : {};
        const totalStudents = summaryData.total_students ?? nextStudents.length;
        const totalClassrooms = summaryData.total_classrooms ?? remoteClassrooms.length;
        const totalTeachers = summaryData.total_teachers ?? remoteTeachers.length;

        setSyncState('connected');
        setBackendMessage(
          partialErrors.length > 0
            ? `Dashboard dimuat sebagian. Gagal mengambil: ${partialErrors.join(', ')}.`
            : `Sinkron dashboard: ${totalStudents} siswa, ${totalClassrooms} kelas, ${totalTeachers} guru.`,
        );
      } catch (error) {
        if (!isActive) return;
        setSyncState('error');
        setBackendMessage(error instanceof Error ? error.message : 'Gagal sinkron ke backend');
      }
    };

    loadBackendData(true);
    const refreshIntervalId = setInterval(() => loadBackendData(false), REFRESH_INTERVAL_MS);

    return () => {
      isActive = false;
      clearInterval(refreshIntervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken, currentUser?.role, metricsRangeDays]);

  const resetDashboard = () => {
    setStudents([]);
    setWarnings([]);
    setDashboardSummary(null);
    setDailyMetrics([]);
    setWeeklyMetrics([]);
    setMetricsByGranularity({ daily: [], weekly: [], monthly: [] });
    setTopClassroomRankings([]);
    setTopStudentPerformers([]);
    setMetricsError('');
    setLiveWarnings([]);
    setHasActiveSession(false);
  };

  // ---- Derived values -------------------------------------------------------
  const teacherMetrics = dashboardSummary?.metrics_summary ?? null;
  const classStats = mapClassroomRankings(topClassroomRankings);

  const averageAttention = teacherMetrics?.avg_focus_percentage
    ?? getAverageFocusFromMetrics(dailyMetrics)
    ?? (students.length > 0
      ? (students.reduce((sum, student) => sum + Number(student.attention ?? 0), 0) / students.length).toFixed(1)
      : null);

  const topStudentPerformer = topStudentPerformers[0] ?? null;
  const topStudent = topStudentPerformer
    ? { name: topStudentPerformer.name, attention: Number(topStudentPerformer.avg_focus_percentage ?? 0) }
    : students.reduce((bestStudent, student) => {
      if (!bestStudent) return student;
      return Number(student.attention ?? 0) > Number(bestStudent.attention ?? 0) ? student : bestStudent;
    }, null);

  const bestClassroom = classStats[0]
    ? { name: classStats[0].name, studentCount: classStats[0].value }
    : null;

  // Selama ada sesi berjalan, peringatan diambil dari kamera. Di luar itu,
  // panel kembali menampilkan rata-rata historis dari endpoint dashboard.
  const displayedWarnings = hasActiveSession ? liveWarnings : warnings;

  return {
    students,
    warnings: displayedWarnings,
    isLiveWarnings: hasActiveSession,
    dashboardSummary,
    dailyMetrics,
    weeklyMetrics,
    metricsByGranularity,
    metricsRangeDays,
    setMetricsRangeDays,
    metricsRangeUsed,
    metricsError,
    topClassroomRankings,
    topStudentPerformers,
    teacherMetrics,
    classStats,
    averageAttention,
    topStudent,
    bestClassroom,
    alertCount: displayedWarnings.length,
    resetDashboard,
  };
}

export default useDashboardData;
