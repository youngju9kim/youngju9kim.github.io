/**
 * PinPad — 숫자 4자리 입력.
 *
 * 폰 키보드가 올라오면 화면이 좁아지고 숫자 외 입력도 들어올 수 있어, 자체 키패드를 쓴다.
 * 마지막 자리를 채우면 곧바로 onComplete 가 호출된다(확인 버튼 없이 진행).
 * 물리 키보드 입력도 함께 받는다(PC 에서 테스트·사용 가능).
 */
import { useCallback, useEffect, useRef } from 'react';
import { Icon } from '@components/Icon/Icon';
import styles from './PinPad.module.css';

export interface PinPadProps {
  value: string;
  onChange: (value: string) => void;
  /** 자리를 모두 채웠을 때 */
  onComplete: (value: string) => void;
  length?: number;
  /** 입력 비활성(잠금·검증 중) */
  disabled?: boolean;
  /** 오답 표시 — 점이 붉게 바뀌고 흔들린다 */
  error?: boolean;
  label?: string;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

export function PinPad({
  value,
  onChange,
  onComplete,
  length = 4,
  disabled = false,
  error = false,
  label = '비밀번호',
}: PinPadProps) {
  /**
   * 빠르게 연타하면 같은 tick 안에서 여러 번 눌려 부모의 value 가 아직 갱신되지 않을 수 있다.
   * ref 로 최신 입력을 직접 들고 있어 자리를 흘리지 않게 한다.
   */
  const latest = useRef(value);
  useEffect(() => {
    latest.current = value;
  }, [value]);

  const push = useCallback(
    (digit: string) => {
      if (disabled || latest.current.length >= length) return;
      const next = latest.current + digit;
      latest.current = next;
      onChange(next);
      if (next.length === length) onComplete(next);
    },
    [disabled, length, onChange, onComplete],
  );

  const pop = useCallback(() => {
    if (disabled || latest.current.length === 0) return;
    const next = latest.current.slice(0, -1);
    latest.current = next;
    onChange(next);
  }, [disabled, onChange]);

  // 물리 키보드 지원
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') push(e.key);
      else if (e.key === 'Backspace') pop();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [push, pop]);

  return (
    <div className={styles.wrap}>
      <div
        className={[styles.dots, error && styles.shake].filter(Boolean).join(' ')}
        role="status"
        aria-label={`${label} ${value.length}자리 입력됨, 전체 ${length}자리`}
      >
        {Array.from({ length }, (_, i) => (
          <span
            key={i}
            className={[
              styles.dot,
              i < value.length && (error ? styles.dotError : styles.dotFilled),
            ]
              .filter(Boolean)
              .join(' ')}
          />
        ))}
      </div>

      <div className={styles.keys}>
        {KEYS.map((k) => (
          <button
            key={k}
            type="button"
            className={styles.key}
            onClick={() => push(k)}
            disabled={disabled}
            aria-label={k}
          >
            {k}
          </button>
        ))}
        <span className={[styles.key, styles.keySpacer].join(' ')} aria-hidden="true" />
        <button
          type="button"
          className={styles.key}
          onClick={() => push('0')}
          disabled={disabled}
          aria-label="0"
        >
          0
        </button>
        <button
          type="button"
          className={[styles.key, styles.keyAction].join(' ')}
          onClick={pop}
          disabled={disabled || value.length === 0}
          aria-label="한 자리 지우기"
        >
          <Icon name="close" size="m" />
        </button>
      </div>
    </div>
  );
}
