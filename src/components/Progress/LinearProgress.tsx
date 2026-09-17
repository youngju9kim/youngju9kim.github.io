/**
 * LinearProgress — PRG-001 (03 §20). 전체 진행률(운동 진행률 등).
 * 색상만으로 상태 표현 금지 → 퍼센트 수치 병행(showValue). MOT-004: 부드럽게 증가.
 */
import styles from './LinearProgress.module.css';

export interface LinearProgressProps {
  /** 0~100 */
  value: number;
  showValue?: boolean;
  label?: string;
  className?: string;
}

export function LinearProgress({
  value,
  showValue = true,
  label,
  className,
}: LinearProgressProps) {
  const clamped = Math.min(100, Math.max(0, Math.round(value)));
  return (
    <div className={[styles.wrap, className].filter(Boolean).join(' ')}>
      {(label || showValue) && (
        <div className={styles.header}>
          {label ? <span className={styles.label}>{label}</span> : <span />}
          {showValue ? <span className={styles.value}>{clamped}%</span> : null}
        </div>
      )}
      <div
        className={styles.track}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? '진행률'}
      >
        <div className={styles.fill} style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}
