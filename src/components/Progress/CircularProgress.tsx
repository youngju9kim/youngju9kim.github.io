/**
 * CircularProgress — PRG-002 (03 §20). 시간 기반 진행(Rest Timer 등).
 * 숫자 정보와 함께 제공. 색상만으로 진행 표현 금지.
 */
import type { ReactNode } from 'react';
import styles from './CircularProgress.module.css';

export interface CircularProgressProps {
  /** 0~100 (남은 비율이 아니라 진행률) */
  value: number;
  /** 중앙에 표시할 내용(남은 시간 등) */
  children?: ReactNode;
  size?: number;
  strokeWidth?: number;
  /** 마지막 구간 강조(예: 휴식 10초) */
  emphasized?: boolean;
  label?: string;
  className?: string;
}

export function CircularProgress({
  value,
  children,
  size = 200,
  strokeWidth = 12,
  emphasized = false,
  label,
  className,
}: CircularProgressProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);

  return (
    <div
      className={[styles.wrap, className].filter(Boolean).join(' ')}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? '진행률'}
    >
      <svg width={size} height={size} className={styles.svg}>
        <circle
          className={styles.track}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          className={emphasized ? styles.indicatorEmphasized : styles.indicator}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className={styles.center}>{children}</div>
    </div>
  );
}
