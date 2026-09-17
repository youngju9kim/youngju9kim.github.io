/**
 * Badge — CMP-009 (03 §15). PR/NEW/운동 개수 등 강조. 보조 정보이며 핵심을 대체하지 않는다.
 */
import type { ReactNode } from 'react';
import { Icon, type IconName } from '@components/Icon/Icon';
import styles from './Badge.module.css';

export type BadgeTone = 'neutral' | 'primary' | 'pr';

export interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  icon?: IconName;
  className?: string;
}

const TONE_CLASS: Record<BadgeTone, string> = {
  neutral: styles.neutral,
  primary: styles.primary,
  pr: styles.pr,
};

export function Badge({ children, tone = 'neutral', icon, className }: BadgeProps) {
  return (
    <span
      className={[styles.badge, TONE_CLASS[tone], className]
        .filter(Boolean)
        .join(' ')}
    >
      {icon ? <Icon name={icon} size="s" /> : null}
      {children}
    </span>
  );
}
