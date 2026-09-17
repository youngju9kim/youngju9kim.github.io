/**
 * Chip — CMP-008 (03 §15). 초급/머신/가슴 등 짧은 속성 표시.
 * 규칙: 긴 텍스트 금지, 필터와 상태 표시를 혼동하지 않는다.
 */
import type { ReactNode } from 'react';
import { Icon, type IconName } from '@components/Icon/Icon';
import styles from './Chip.module.css';

export type ChipVariant = 'filled' | 'outlined' | 'success' | 'warning';

export interface ChipProps {
  children: ReactNode;
  variant?: ChipVariant;
  /** 색상 단독 의미 전달 방지(A11Y-002)를 위한 아이콘 */
  icon?: IconName;
  className?: string;
}

const VARIANT_CLASS: Record<ChipVariant, string> = {
  filled: styles.filled,
  outlined: styles.outlined,
  success: styles.success,
  warning: styles.warning,
};

export function Chip({ children, variant = 'filled', icon, className }: ChipProps) {
  return (
    <span
      className={[styles.chip, VARIANT_CLASS[variant], className]
        .filter(Boolean)
        .join(' ')}
    >
      {icon ? <Icon name={icon} size="s" /> : null}
      {children}
    </span>
  );
}
