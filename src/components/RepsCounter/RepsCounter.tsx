/**
 * RepsCounter — 목업 세트 화면의 큰 원형 반복 카운터.
 * [−] (원형: 현재/목표) [+]. 짧게=1, 길게=연속(INT-005). 접근성: spinbutton.
 */
import { useEffect, useRef } from 'react';
import { Icon } from '@components/Icon/Icon';
import styles from './RepsCounter.module.css';

export interface RepsCounterProps {
  value: number;
  target: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
}

export function RepsCounter({
  value,
  target,
  onChange,
  min = 0,
  max = 100,
  label = '반복 횟수',
}: RepsCounterProps) {
  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdDelay = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const nudge = (d: 1 | -1) => onChange(clamp(value + d));

  const startHold = (d: 1 | -1) => {
    nudge(d);
    holdDelay.current = setTimeout(() => {
      holdTimer.current = setInterval(() => {
        onChange(clamp((holdRef.current += d)));
      }, 120);
    }, 400);
  };
  // 연속 증감 중 최신 값을 추적
  const holdRef = useRef(value);
  useEffect(() => {
    holdRef.current = value;
  }, [value]);

  const stopHold = () => {
    if (holdDelay.current) clearTimeout(holdDelay.current);
    if (holdTimer.current) clearInterval(holdTimer.current);
    holdDelay.current = null;
    holdTimer.current = null;
  };
  useEffect(() => stopHold, []);

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.stepBtn}
        aria-label={`${label} 감소`}
        disabled={value <= min}
        onPointerDown={() => startHold(-1)}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
        onPointerCancel={stopHold}
      >
        <Icon name="minus" size="l" />
      </button>

      <div
        className={styles.circle}
        role="spinbutton"
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-label={label}
      >
        <span className={styles.value}>{value}</span>
        <span className={styles.target}>/ {target}</span>
      </div>

      <button
        type="button"
        className={styles.stepBtn}
        aria-label={`${label} 증가`}
        disabled={value >= max}
        onPointerDown={() => startHold(1)}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
        onPointerCancel={stopHold}
      >
        <Icon name="plus" size="l" />
      </button>
    </div>
  );
}
