/**
 * TopAppBar — NAV-002 (03 §18, SCR-001). 현재 화면 제목 + 주요 작업.
 * 규칙: 제목 한 줄, 액션 최대 2개, 화면마다 높이 변경 금지(고정 높이 토큰).
 */
import type { ReactNode } from 'react';
import { IconButton } from '@components/IconButton/IconButton';
import styles from './TopAppBar.module.css';

export interface TopAppBarProps {
  title: string;
  /** 뒤로가기 핸들러 — 있으면 back 헤더 */
  onBack?: () => void;
  /** 우측 액션(최대 2개 권장) */
  actions?: ReactNode;
}

export function TopAppBar({ title, onBack, actions }: TopAppBarProps) {
  return (
    <header className={styles.bar}>
      <div className={styles.leading}>
        {onBack ? (
          <IconButton icon="chevron-left" label="뒤로" onClick={onBack} />
        ) : null}
      </div>
      <h1 className={styles.title}>{title}</h1>
      <div className={styles.actions}>{actions}</div>
    </header>
  );
}
