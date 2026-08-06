import {
  ArcElement,
  BarElement,
  CategoryScale,
  ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  useAuthSession,
  useBackendHealth,
  useCameras,
  useClassrooms,
  useDashboardData,
  useLiveStream,
  useProfile,
  useSessions,
  useStudents,
  useTeachers,
  useUiState,
  LoginPage,
  Sidebar,
  AppHeader,
  SyncStatusBanner,
  SummaryMetrics,
  DashboardView,
  LiveView,
  StudentsView,
  StudentFormModal,
  StudentDetailModal,
  ClassroomsView,
  ClassroomFormModal,
  ClassroomDetailView,
  TeachersView,
  TeacherFormModal,
  TeacherDetailModal,
  CamerasView,
  CameraFormModal,
  CameraDetailModal,
  SessionsView,
  SessionFormModal,
  SessionDetailModal,
  ReportsView,
  ProfileView,
} from './imports';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

/**
 * App hanya bertugas sebagai penghubung: merangkai hooks domain dengan komponen
 * tampilan. Seluruh detail logika ada di `src/hooks`, seluruh markup ada di
 * `src/components/<domain>`.
 */
export default function App() {
  const auth = useAuthSession();
  const ui = useUiState(auth.currentUser);
  const health = useBackendHealth();

  const profile = useProfile({
    authToken: auth.authToken,
    currentUser: auth.currentUser,
    setCurrentUser: auth.setCurrentUser,
  });

  const teachers = useTeachers({
    authToken: auth.authToken,
    activeTab: ui.activeTab,
    searchQuery: ui.searchQuery,
  });

  const cameras = useCameras({
    authToken: auth.authToken,
    activeTab: ui.activeTab,
    searchQuery: ui.searchQuery,
  });

  const students = useStudents({
    authToken: auth.authToken,
    activeTab: ui.activeTab,
    searchQuery: ui.searchQuery,
    currentUser: auth.currentUser,
  });

  const live = useLiveStream({
    authToken: auth.authToken,
    setBackendMessage: auth.setBackendMessage,
  });

  const classrooms = useClassrooms({
    authToken: auth.authToken,
    activeTab: ui.activeTab,
    setActiveTab: ui.setActiveTab,
    searchQuery: ui.searchQuery,
    onClassroomRenamed: students.applyClassroomRename,
    onClassroomDeleted: students.clearClassroomFromForm,
    onOpenDetail: (classroom) => sessions.prefillClassroom(classroom.id),
  });

  const sessions = useSessions({
    authToken: auth.authToken,
    activeTab: ui.activeTab,
    searchQuery: ui.searchQuery,
    setBackendMessage: auth.setBackendMessage,
    reloadCameraOptions: cameras.reloadCameraOptions,
    onMonitorStream: live.handleMonitorStream,
    classroomDetail: classrooms.classroomDetail,
    setClassroomDetail: classrooms.setClassroomDetail,
  });

  const dashboard = useDashboardData({
    authToken: auth.authToken,
    currentUser: auth.currentUser,
    setSyncState: auth.setSyncState,
    setBackendMessage: auth.setBackendMessage,
    setLastSyncedAt: auth.setLastSyncedAt,
    setSessions: sessions.setSessions,
    setTeachers: teachers.setTeachers,
    setBackendClassrooms: classrooms.setBackendClassrooms,
    setBoxes: live.setBoxes,
    topClassroomFallback: classrooms.backendClassrooms,
  });

  // ---- Derived shell values -------------------------------------------------
  const isInitialLoading = auth.syncState === 'loading'
    && !dashboard.dashboardSummary
    && dashboard.students.length === 0;
  const isRefreshing = auth.syncState === 'loading'
    && Boolean(dashboard.dashboardSummary || dashboard.students.length > 0);
  const dashboardErrorMessage = auth.syncState === 'error' ? auth.backendMessage : '';

  const totalStudentsCount = dashboard.dashboardSummary?.total_students ?? dashboard.students.length;
  const totalClassroomsCount = dashboard.dashboardSummary?.total_classrooms ?? classrooms.backendClassrooms.length;
  const totalTeachersCount = auth.isPrincipalUser
    ? (dashboard.dashboardSummary?.total_teachers ?? teachers.teachers.length)
    : null;
  const totalSubjectsCount = dashboard.dashboardSummary?.total_subjects ?? 0;

  // Daftar siswa yang ditampilkan: hasil paginasi backend, atau hasil filter lokal.
  const shouldUseFiltered = ui.searchQuery.trim() !== ''
    || ui.classFilter !== 'All'
    || ui.statusFilter !== 'All';

  const filteredStudents = dashboard.students.filter((student) => {
    const query = ui.searchQuery.toLowerCase();
    const matchesSearch = String(student.name || '').toLowerCase().includes(query)
      || String(student.class || '').toLowerCase().includes(query);
    const matchesClass = ui.classFilter === 'All' || student.class === ui.classFilter;
    const matchesStatus = ui.statusFilter === 'All' || student.status === ui.statusFilter;
    return matchesSearch && matchesClass && matchesStatus;
  });

  const displayedStudents = (shouldUseFiltered ? filteredStudents : students.studentList)
    .filter((student) => {
      const matchesClass = ui.classFilter === 'All' || student.class === ui.classFilter;
      const matchesStatus = ui.statusFilter === 'All' || student.status === ui.statusFilter;
      return matchesClass && matchesStatus;
    });

  const selectedStreamSession = sessions.sessions.find(
    (session) => String(session.id) === String(live.selectedStreamSessionId),
  );

  const handleSearchChange = (value) => {
    ui.setSearchQuery(value);
    students.setStudentPage(1);
    classrooms.setClassroomPage(1);
    sessions.setSessionPage(1);
  };

  const handleLogout = () => {
    auth.handleLogout();
    dashboard.resetDashboard();
    live.resetLiveState();
    classrooms.setClassroomDetail(null);
    classrooms.setBackendClassrooms([]);
    teachers.setTeachers([]);
    sessions.setSessions([]);
  };

  if (!auth.authToken) {
    return (
      <LoginPage
        loginForm={auth.loginForm}
        setLoginForm={auth.setLoginForm}
        onSubmit={async (event) => {
          const success = await auth.handleLoginSubmit(event);
          if (success) ui.setActiveTab('dashboard');
        }}
        error={auth.loginError}
        statusMessage={auth.backendMessage}
        isLoading={auth.syncState === 'loading'}
      />
    );
  }

  return (
    <div className="app-container">
      <Sidebar
        activeTab={ui.activeTab}
        onSelectTab={ui.setActiveTab}
        currentUser={auth.currentUser}
        avatarInitials={profile.profileData.avatarInitials}
      />

      <main className="main-content">
        <AppHeader
          activeTab={ui.activeTab}
          searchQuery={ui.searchQuery}
          onSearchChange={handleSearchChange}
          backendHealthState={health.backendHealthState}
        />

        <SyncStatusBanner
          isInitialLoading={isInitialLoading}
          isRefreshing={isRefreshing}
          errorMessage={dashboardErrorMessage}
          lastSyncedAt={auth.lastSyncedAt}
        />

        {ui.activeTab !== 'reports' && ui.activeTab !== 'profile' && (
          <SummaryMetrics
            isPrincipalUser={auth.isPrincipalUser}
            dashboardSummary={dashboard.dashboardSummary}
            totalStudentsCount={totalStudentsCount}
            totalClassroomsCount={totalClassroomsCount}
            totalTeachersCount={totalTeachersCount}
            totalSubjectsCount={totalSubjectsCount}
            teacherAvgFocus={dashboard.teacherMetrics?.avg_focus_percentage ?? 0}
            teacherAvgActiveStudents={dashboard.teacherMetrics?.avg_active_students ?? 0}
            teacherUsingPhone={dashboard.teacherMetrics?.total_using_phone ?? 0}
            teacherRaisedHand={dashboard.teacherMetrics?.total_raised_hand ?? 0}
          />
        )}

        {ui.activeTab === 'dashboard' && (
          <DashboardView
            isInitialLoading={isInitialLoading}
            dailyMetrics={dashboard.dailyMetrics}
            metricsRangeDays={dashboard.metricsRangeDays}
            onMetricsRangeChange={dashboard.setMetricsRangeDays}
            metricsRangeUsed={dashboard.metricsRangeUsed}
            metricsError={dashboard.metricsError}
            topClassroomRankings={dashboard.topClassroomRankings}
            topStudentPerformers={dashboard.topStudentPerformers}
            warnings={dashboard.warnings}
            isLiveWarnings={dashboard.isLiveWarnings}
          />
        )}

        {ui.activeTab === 'live' && (
          <LiveView
            imgRef={live.imgRef}
            canvasRef={live.canvasRef}
            streamUrl={live.streamUrl}
            streamError={live.streamError}
            streamLoading={live.streamLoading}
            onStreamLoaded={() => live.streamError && live.setStreamError('')}
            onStreamFailed={() => {
              live.setStreamError('Gagal memuat stream backend. Periksa koneksi kamera atau endpoint.');
              live.setStreamUrl('');
            }}
            liveLog={live.liveLog}
            detectedPeople={live.detectedPeople}
            detectionStreamActive={live.detectionStreamActive}
            detectionError={live.detectionError}
            sessions={sessions.sessions}
            selectedStreamSessionId={live.selectedStreamSessionId}
            onSelectStreamSession={live.setSelectedStreamSessionId}
            selectedStreamSession={selectedStreamSession}
            onStartStream={live.handleMonitorStream}
            onStopStream={live.handleStopStream}
          />
        )}

        {ui.activeTab === 'students' && (
          <StudentsView
            students={displayedStudents}
            studentMeta={students.studentMeta}
            studentPage={students.studentPage}
            studentTotalPages={students.studentTotalPages}
            studentLoading={students.studentLoading || isInitialLoading}
            studentError={students.studentError}
            classroomFilterOptions={classrooms.classroomFilterOptions}
            classFilter={ui.classFilter}
            onClassFilterChange={(value) => { ui.setClassFilter(value); students.setStudentPage(1); }}
            statusFilter={ui.statusFilter}
            onStatusFilterChange={ui.setStatusFilter}
            searchQuery={ui.searchQuery}
            onPageChange={students.setStudentPage}
            onCreate={students.openStudentCreateModal}
            onDetail={students.handleStudentDetail}
            onEdit={students.startEditStudent}
            onDelete={students.handleDeleteStudent}
          />
        )}

        {ui.activeTab === 'classrooms' && (
          <ClassroomsView
            classrooms={classrooms.filteredClassrooms}
            classroomMeta={classrooms.classroomMeta}
            classroomPage={classrooms.classroomPage}
            classroomLoading={classrooms.classroomLoading}
            classroomError={classrooms.classroomError}
            searchQuery={ui.searchQuery}
            onPageChange={classrooms.setClassroomPage}
            onCreate={classrooms.openClassroomCreateModal}
            onDetail={classrooms.openClassroomDetail}
            onEdit={classrooms.startEditClassroom}
            onDelete={classrooms.handleDeleteClassroom}
          />
        )}

        {ui.activeTab === 'classroom-detail' && (
          <ClassroomDetailView
            classroomDetail={classrooms.classroomDetail}
            classroomDetailLoading={classrooms.classroomDetailLoading}
            classroomDetailError={classrooms.classroomDetailError}
            onBack={classrooms.closeClassroomDetail}
          />
        )}

        {ui.activeTab === 'sessions' && (
          <SessionsView
            sessions={sessions.sessions}
            sessionMeta={sessions.sessionMeta}
            sessionPage={sessions.sessionPage}
            sessionLoading={sessions.sessionLoading}
            sessionError={sessions.sessionError}
            searchQuery={ui.searchQuery}
            canCreateSession={auth.isTeacherUser}
            onPageChange={sessions.setSessionPage}
            onCreate={sessions.openSessionForm}
            onDetail={sessions.handleSessionDetail}
          />
        )}

        {ui.activeTab === 'cameras' && (
          <CamerasView
            cameraList={cameras.cameraList}
            cameraMeta={cameras.cameraMeta}
            cameraPage={cameras.cameraPage}
            cameraLoading={cameras.cameraLoading}
            cameraError={cameras.cameraError}
            searchQuery={ui.searchQuery}
            onPageChange={cameras.setCameraPage}
            onCreate={cameras.openCameraForm}
            onDetail={cameras.handleViewCameraDetail}
            onEdit={cameras.openCameraForm}
            onDelete={cameras.handleDeleteCamera}
          />
        )}

        {ui.activeTab === 'teachers' && (
          <TeachersView
            teachers={teachers.filteredTeachers}
            isPrincipalUser={auth.isPrincipalUser}
            searchQuery={ui.searchQuery}
            onCreate={teachers.openTeacherCreateModal}
            onView={teachers.handleViewTeacher}
            onEdit={teachers.startEditTeacher}
            onDelete={teachers.handleDeleteTeacher}
          />
        )}

        {ui.activeTab === 'reports' && (
          <ReportsView
            students={dashboard.students}
            dailyMetrics={dashboard.dailyMetrics}
            topClassroomRankings={dashboard.topClassroomRankings}
            averageAttention={dashboard.averageAttention}
            topStudent={dashboard.topStudent}
            bestClassroom={dashboard.bestClassroom}
            alertCount={dashboard.alertCount}
          />
        )}

        {ui.activeTab === 'profile' && (
          <ProfileView
            profileData={profile.profileData}
            profileError={profile.profileError}
            syncState={auth.syncState}
            currentUser={auth.currentUser}
            totalStudentsCount={totalStudentsCount}
            totalTeachersCount={totalTeachersCount ?? teachers.teachers.length}
            totalClassroomsCount={totalClassroomsCount}
            onLogout={handleLogout}
          />
        )}

        {/* ---- Modals ---- */}
        <StudentDetailModal
          studentDetail={students.studentDetail}
          authToken={auth.authToken}
          onClose={() => students.setStudentDetail(null)}
        />

        <StudentFormModal
          isOpen={students.isStudentEditorOpen}
          editingStudentId={students.editingStudentId}
          studentForm={students.studentForm}
          setStudentForm={students.setStudentForm}
          studentFormMessage={students.studentFormMessage}
          classroomOptions={classrooms.classroomOptions}
          onSubmit={students.handleStudentSubmit}
          onClose={students.resetStudentForm}
        />

        <TeacherDetailModal
          teacherDetailModal={teachers.teacherDetailModal}
          teacherDetailLoading={teachers.teacherDetailLoading}
          teacherDetailData={teachers.teacherDetailData}
          teacherErrorMsg={teachers.teacherErrorMsg}
          teacherSessions={teachers.teacherSessions}
          teacherSessionsError={teachers.teacherSessionsError}
          onClose={teachers.closeTeacherDetail}
        />

        <TeacherFormModal
          isOpen={teachers.isTeacherFormOpen}
          editingTeacherId={teachers.editingTeacherId}
          teacherForm={teachers.teacherForm}
          setTeacherForm={teachers.setTeacherForm}
          teacherFormError={teachers.teacherFormError}
          teacherFormMessage={teachers.teacherFormMessage}
          isTeacherSaving={teachers.isTeacherSaving}
          onSubmit={teachers.handleTeacherSubmit}
          onClose={teachers.resetTeacherForm}
        />

        <ClassroomFormModal
          isOpen={classrooms.isClassroomFormOpen}
          editingClassroomId={classrooms.editingClassroomId}
          classroomForm={classrooms.classroomForm}
          setClassroomForm={classrooms.setClassroomForm}
          classroomError={classrooms.classroomError}
          onSubmit={classrooms.handleClassroomSubmit}
          onClose={classrooms.resetClassroomForm}
        />

        <SessionFormModal
          isOpen={sessions.isSessionFormOpen}
          sessionForm={sessions.sessionForm}
          setSessionForm={sessions.setSessionForm}
          sessionFormError={sessions.sessionFormError}
          sessionFormMessage={sessions.sessionFormMessage}
          isSessionSaving={sessions.isSessionSaving}
          classroomOptions={classrooms.classroomOptions}
          cameraOptions={cameras.cameraOptions}
          onSubmit={sessions.handleSessionSubmit}
          onClose={sessions.resetSessionForm}
        />

        <SessionDetailModal
          isOpen={sessions.isSessionDetailOpen}
          sessionDetail={sessions.sessionDetail}
          sessionDetailLoading={sessions.sessionDetailLoading}
          sessionDetailError={sessions.sessionDetailError}
          isTeacherUser={auth.isTeacherUser}
          sessionActionState={sessions.sessionActionState}
          sessionActionMessage={sessions.sessionActionMessage}
          isEvaluating={sessions.isEvaluating}
          registerStudentId={sessions.registerStudentId}
          setRegisterStudentId={sessions.setRegisterStudentId}
          registerStudentOptions={sessions.registerStudentOptions}
          onRegisterStudentPose={sessions.handleRegisterStudentPose}
          onStartEvaluation={sessions.handleStartEvaluation}
          onEndEvaluation={sessions.handleEndEvaluation}
          onEndSession={sessions.handleEndClassroomSession}
          onClose={sessions.closeSessionDetail}
        />

        <CameraFormModal
          isOpen={cameras.isCameraFormOpen}
          editingCameraId={cameras.editingCameraId}
          cameraForm={cameras.cameraForm}
          setCameraForm={cameras.setCameraForm}
          cameraFormError={cameras.cameraFormError}
          cameraFormMessage={cameras.cameraFormMessage}
          isSaving={cameras.cameraDetailLoading}
          onSubmit={cameras.handleCameraSubmit}
          onClose={cameras.resetCameraForm}
        />

        <CameraDetailModal
          isOpen={cameras.isCameraDetailOpen}
          cameraDetail={cameras.cameraDetail}
          cameraDetailLoading={cameras.cameraDetailLoading}
          cameraDetailError={cameras.cameraDetailError}
          onClose={cameras.closeCameraDetail}
        />
      </main>
    </div>
  );
}
