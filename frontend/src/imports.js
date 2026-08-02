/**
 * Barrel tunggal untuk seluruh aplikasi.
 *
 * Semua file (App, hooks, dan komponen) cukup mengimpor dari file ini:
 *
 *   import { useState, Plus, ActionButton, useStudents } from '../imports';
 *
 * Sumber aslinya tetap ada di masing-masing file; di sini hanya di-export ulang
 * supaya daftar import tidak tersebar di banyak tempat.
 */

// ---- Library eksternal ------------------------------------------------------
// React hooks dasar (useState/useEffect/useRef), ikon lucide, dan Chart.js
// sudah ikut ter-export lewat `export * from './lib/backendApi'` di bawah.
export { useCallback, useMemo, StrictMode } from 'react';
export { createRoot } from 'react-dom/client';
export { ChevronLeft, ChevronRight, Loader, LogIn, ShieldCheck, UserRound } from 'lucide-react';

// ---- Backend API, chart, ikon, dan React hooks -------------------------------
export * from './lib/backendApi';

// ---- Utils ------------------------------------------------------------------
export * from './utils/formatters';
export * from './utils/chartConfig';

// ---- Assets -----------------------------------------------------------------
export { default as logoEdupose } from './assets/logo-edupose.png';

// ---- Hooks ------------------------------------------------------------------
export { default as useAuthSession } from './hooks/useAuthSession';
export { default as useBackendHealth } from './hooks/useBackendHealth';
export { default as useCameras } from './hooks/useCameras';
export { default as useClassrooms } from './hooks/useClassrooms';
export { default as useDashboardData } from './hooks/useDashboardData';
export { default as useLiveStream } from './hooks/useLiveStream';
export { default as useProfile } from './hooks/useProfile';
export { default as useSessions } from './hooks/useSessions';
export { default as useStudents } from './hooks/useStudents';
export { default as useTeachers } from './hooks/useTeachers';
export { default as useUiState } from './hooks/useUiState';

// ---- Komponen umum ----------------------------------------------------------
export { default as ActionButton } from './components/common/ActionButton';
export { default as Modal } from './components/common/Modal';
export { default as Pagination } from './components/common/Pagination';

// ---- Layout -----------------------------------------------------------------
export { default as Sidebar } from './components/layout/Sidebar';
export { default as AppHeader } from './components/layout/AppHeader';
export { default as SyncStatusBanner } from './components/layout/SyncStatusBanner';
export { default as SummaryMetrics } from './components/layout/SummaryMetrics';

// ---- Auth -------------------------------------------------------------------
export { default as LoginPage } from './components/auth/LoginPage';

// ---- Dashboard, live, reports, profile --------------------------------------
export { default as DashboardView } from './components/dashboard/DashboardView';
export { default as LiveView } from './components/live/LiveView';
export { default as ReportsView } from './components/reports/ReportsView';
export { default as ProfileView } from './components/profile/ProfileView';

// ---- Siswa ------------------------------------------------------------------
export { default as StudentsView } from './components/students/StudentsView';
export { default as StudentFormModal } from './components/students/StudentFormModal';
export { default as StudentDetailModal } from './components/students/StudentDetailModal';
export { default as StudentSessionsHistoryDisplay } from './components/students/StudentSessionsHistoryDisplay';

// ---- Kelas ------------------------------------------------------------------
export { default as ClassroomsView } from './components/classrooms/ClassroomsView';
export { default as ClassroomFormModal } from './components/classrooms/ClassroomFormModal';
export { default as ClassroomDetailView } from './components/classrooms/ClassroomDetailView';

// ---- Guru -------------------------------------------------------------------
export { default as TeachersView } from './components/teachers/TeachersView';
export { default as TeacherFormModal } from './components/teachers/TeacherFormModal';
export { default as TeacherDetailModal } from './components/teachers/TeacherDetailModal';
export { default as TeacherSessionsHistory } from './components/teachers/TeacherSessionsHistory';

// ---- Kamera -----------------------------------------------------------------
export { default as CamerasView } from './components/cameras/CamerasView';
export { default as CameraFormModal } from './components/cameras/CameraFormModal';
export { default as CameraDetailModal } from './components/cameras/CameraDetailModal';

// ---- Sesi -------------------------------------------------------------------
export { default as SessionsView } from './components/sessions/SessionsView';
export { default as SessionFormModal } from './components/sessions/SessionFormModal';
export { default as SessionDetailModal } from './components/sessions/SessionDetailModal';

// ---- App --------------------------------------------------------------------
export { default as App } from './App';
