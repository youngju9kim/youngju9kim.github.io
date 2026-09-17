/**
 * WorkoutLayout — 운동 진행/휴식/요약 전용 풀스크린 레이아웃.
 * Bottom Navigation 을 숨겨 운동 흐름에 집중(02 §6 NAV-002, 03 §18).
 */
import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { PageFallback } from './PageFallback';
import styles from './Layout.module.css';

export function WorkoutLayout() {
  return (
    <div className={styles.shell}>
      <main id="main" tabIndex={-1} className={styles.contentFull}>
        <div className={styles.container}>
          <Suspense fallback={<PageFallback />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
