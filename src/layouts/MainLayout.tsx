/**
 * MainLayout — Home/History/Statistics/Settings/Routine 공통 레이아웃.
 * Bottom Navigation 을 항상 표시하고, 콘텐츠는 최대 폭(RSP-002) + 중앙 정렬.
 * 하단 콘텐츠가 Bottom Nav 와 겹치지 않도록 여백을 확보(14. Safe Area).
 * lazy 페이지 로딩은 Suspense 로 감싼다(코드 스플리팅).
 */
import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { BottomNavigation } from '@components/BottomNavigation/BottomNavigation';
import { PageFallback } from './PageFallback';
import styles from './Layout.module.css';

export function MainLayout() {
  return (
    <div className={styles.shell}>
      <main id="main" tabIndex={-1} className={styles.contentWithNav}>
        <div className={styles.container}>
          <Suspense fallback={<PageFallback />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
      <BottomNavigation />
    </div>
  );
}
