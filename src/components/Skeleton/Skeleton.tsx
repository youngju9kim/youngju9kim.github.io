/**
 * Skeleton — LOAD-001 (03 §21). 로딩 중 레이아웃 예측 가능하게 유지.
 * 실제 콘텐츠와 동일 구조를 흉내내어 로딩 완료 후 Layout Shift 를 방지한다.
 */
import type { CSSProperties } from 'react';
import styles from './Skeleton.module.css';

export interface SkeletonProps {
  /** CSS width (예: '100%', 120) */
  width?: string | number;
  /** CSS height */
  height?: string | number;
  variant?: 'text' | 'rect' | 'circle';
  className?: string;
}

export function Skeleton({
  width = '100%',
  height,
  variant = 'text',
  className,
}: SkeletonProps) {
  const style: CSSProperties = {
    width,
    height: height ?? (variant === 'text' ? '1em' : undefined),
  };
  return (
    <span
      className={[styles.skeleton, styles[variant], className]
        .filter(Boolean)
        .join(' ')}
      style={style}
      aria-hidden="true"
    />
  );
}
