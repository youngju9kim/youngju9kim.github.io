/**
 * FAB — NAV-003 (03 §18). 가장 자주 쓰는 생성 작업(예: 루틴 생성).
 * 규칙: 화면당 하나, Bottom Navigation 과 겹치지 않게 배치, 운동 진행 화면에서 미사용.
 */
import type { ButtonHTMLAttributes } from 'react';
import { Icon, type IconName } from '@components/Icon/Icon';
import styles from './Fab.module.css';

export interface FabProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  icon: IconName;
  /** 접근성 레이블 필수 */
  label: string;
}

export function Fab({ icon, label, type = 'button', ...rest }: FabProps) {
  return (
    <button
      type={type}
      className={styles.fab}
      aria-label={label}
      title={label}
      {...rest}
    >
      <Icon name={icon} size="l" />
    </button>
  );
}
