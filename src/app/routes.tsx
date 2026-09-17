/**
 * 라우팅 정의 (02_UI_UX §7~9 Navigation Structure).
 *
 * MainLayout(Bottom Nav 표시): Home / History / Statistics / Settings / Routine.
 * WorkoutLayout(Bottom Nav 숨김): 운동 진행/요약 — 운동 흐름 집중(NAV-002).
 *
 * 성능(07 §18 PERF-004, §13 App Shell): 페이지를 React.lazy 로 코드 스플리팅하여
 * 초기 로딩에 필요한 셸만 먼저 로드하고 각 화면은 필요 시 로드한다.
 */
import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MainLayout } from '@layouts/MainLayout';
import { WorkoutLayout } from '@layouts/WorkoutLayout';

const HomePage = lazy(() =>
  import('@pages/HomePage').then((m) => ({ default: m.HomePage })),
);
const HistoryPage = lazy(() =>
  import('@pages/HistoryPage').then((m) => ({ default: m.HistoryPage })),
);
const WorkoutDetailPage = lazy(() =>
  import('@pages/WorkoutDetailPage').then((m) => ({ default: m.WorkoutDetailPage })),
);
const StatisticsPage = lazy(() =>
  import('@pages/StatisticsPage').then((m) => ({ default: m.StatisticsPage })),
);
const SettingsPage = lazy(() =>
  import('@pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);
const ExerciseVideoSettingsPage = lazy(() =>
  import('@pages/ExerciseVideoSettingsPage').then((m) => ({
    default: m.ExerciseVideoSettingsPage,
  })),
);
const RoutineListPage = lazy(() =>
  import('@pages/RoutineListPage').then((m) => ({ default: m.RoutineListPage })),
);
const RoutineCreatePage = lazy(() =>
  import('@pages/RoutineCreatePage').then((m) => ({ default: m.RoutineCreatePage })),
);
const RoutineEditorPage = lazy(() =>
  import('@pages/RoutineEditorPage').then((m) => ({ default: m.RoutineEditorPage })),
);
const TodayWorkoutPage = lazy(() =>
  import('@pages/TodayWorkoutPage').then((m) => ({ default: m.TodayWorkoutPage })),
);
const WorkoutSessionPage = lazy(() =>
  import('@pages/WorkoutSessionPage').then((m) => ({ default: m.WorkoutSessionPage })),
);
const WorkoutSummaryPage = lazy(() =>
  import('@pages/WorkoutSummaryPage').then((m) => ({ default: m.WorkoutSummaryPage })),
);

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'history', element: <HistoryPage /> },
      { path: 'history/:id', element: <WorkoutDetailPage /> },
      { path: 'statistics', element: <StatisticsPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'settings/videos', element: <ExerciseVideoSettingsPage /> },
      { path: 'routines', element: <RoutineListPage /> },
      { path: 'routines/new', element: <RoutineCreatePage /> },
      { path: 'routines/:id/edit', element: <RoutineEditorPage /> },
      { path: 'today/:routineId', element: <TodayWorkoutPage /> },
    ],
  },
  {
    path: '/workout',
    element: <WorkoutLayout />,
    children: [
      { index: true, element: <WorkoutSessionPage /> },
      { path: 'summary/:recordId', element: <WorkoutSummaryPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
