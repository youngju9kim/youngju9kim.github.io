/**
 * Stepper — CMP-005 (03 §15, INT-005).
 *  - 짧게 누르기: 1단계(step) 증감
 *  - 길게 누르기: 연속 증감
 *  - 직접 입력 허용
 *  - Validation: min(기본 0) 이상, max 이하. 범위 초과 입력 제한, 음수 불가.
 *
 * 중량/반복 입력에 사용. 값은 제어 컴포넌트로 상위에서 관리(즉시 반영, 저장버튼 없음).
 */
import { useEffect, useId, useRef } from 'react';
import { Icon } from '@components/Icon/Icon';
import styles from './Stepper.module.css';

export interface StepperProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  /** 소수점 허용 여부 (설정의 단위/정밀도에 따름). false면 정수만. */
  allowDecimal?: boolean;
  /** kg, reps 등 단위 표시 */
  unit?: string;
  disabled?: boolean;
  className?: string;
}

export function Stepper({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  allowDecimal = false,
  unit,
  disabled = false,
  className,
}: StepperProps) {
  const inputId = useId();
  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdDelay = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clamp = (n: number) => Math.min(max, Math.max(min, n));

  const nudge = (dir: 1 | -1) => {
    onChange(clamp(Number((value + dir * step).toFixed(allowDecimal ? 2 : 0))));
  };

  // 길게 누르기: 지연 후 연속 증감 (INT-005)
  const startHold = (dir: 1 | -1) => {
    nudge(dir);
    holdDelay.current = setTimeout(() => {
      holdTimer.current = setInterval(() => nudge(dir), 100);
    }, 400);
  };
  const stopHold = () => {
    if (holdDelay.current) clearTimeout(holdDelay.current);
    if (holdTimer.current) clearInterval(holdTimer.current);
    holdDelay.current = null;
    holdTimer.current = null;
  };

  useEffect(() => stopHold, []);

  const handleInput = (raw: string) => {
    if (raw === '') {
      onChange(min);
      return;
    }
    const parsed = allowDecimal ? parseFloat(raw) : parseInt(raw, 10);
    if (Number.isNaN(parsed)) return;
    onChange(clamp(parsed));
  };

  return (
    <div className={[styles.wrapper, className].filter(Boolean).join(' ')}>
      <label className={styles.label} htmlFor={inputId}>
        {label}
      </label>
      <div className={styles.stepper}>
        <button
          type="button"
          className={styles.btn}
          aria-label={`${label} 감소`}
          disabled={disabled || value <= min}
          onPointerDown={() => startHold(-1)}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
          onPointerCancel={stopHold}
        >
          <Icon name="minus" size="m" />
        </button>

        <div className={styles.valueWrap}>
          <input
            id={inputId}
            className={styles.value}
            type="number"
            inputMode={allowDecimal ? 'decimal' : 'numeric'}
            role="spinbutton"
            aria-valuenow={value}
            aria-valuemin={min}
            aria-valuemax={max === Number.MAX_SAFE_INTEGER ? undefined : max}
            aria-label={label}
            value={value}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            onChange={(e) => handleInput(e.target.value)}
          />
          {unit ? <span className={styles.unit}>{unit}</span> : null}
        </div>

        <button
          type="button"
          className={styles.btn}
          aria-label={`${label} 증가`}
          disabled={disabled || value >= max}
          onPointerDown={() => startHold(1)}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
          onPointerCancel={stopHold}
        >
          <Icon name="plus" size="m" />
        </button>
      </div>
    </div>
  );
}
