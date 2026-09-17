/**
 * PageFallback — lazy 라우트 로딩 중 표시(LOAD-001 정신: 레이아웃 예측).
 * 짧은 로딩이라 Skeleton 카드 몇 개로 자리만 유지한다.
 */
import { Skeleton } from '@components';
import styles from './Layout.module.css';

export function PageFallback() {
  return (
    <div className={styles.fallback} aria-busy="true" aria-label="불러오는 중">
      <Skeleton variant="rect" height={56} />
      <Skeleton variant="rect" height={120} />
      <Skeleton variant="rect" height={120} />
    </div>
  );
}
