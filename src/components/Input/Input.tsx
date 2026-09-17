/**
 * Input — CMP-004 (03 §15). 구조: Label → Input → Helper → Validation (SCR-004).
 * 규칙: Label 항상 표시, Placeholder 만으로 의미 전달 금지.
 * 오류 메시지는 입력 필드 바로 아래 + 접근성 연결(aria-describedby, aria-invalid).
 */
import { useId, type InputHTMLAttributes } from 'react';
import { Icon } from '@components/Icon/Icon';
import styles from './Input.module.css';

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  label: string;
  helperText?: string;
  /** 오류 메시지 — 존재하면 error 상태로 표시 */
  errorText?: string;
  className?: string;
}

export function Input({
  label,
  helperText,
  errorText,
  id,
  className,
  ...rest
}: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;
  const hasError = Boolean(errorText);

  return (
    <div
      className={[styles.field, hasError && styles.error, className]
        .filter(Boolean)
        .join(' ')}
    >
      <label className={styles.label} htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        className={styles.control}
        aria-invalid={hasError || undefined}
        aria-describedby={
          [helperText && helperId, hasError && errorId]
            .filter(Boolean)
            .join(' ') || undefined
        }
        {...rest}
      />
      {helperText && !hasError ? (
        <span id={helperId} className={styles.helper}>
          {helperText}
        </span>
      ) : null}
      {hasError ? (
        <span id={errorId} className={styles.validation} role="alert">
          <Icon name="error" size="s" />
          {errorText}
        </span>
      ) : null}
    </div>
  );
}
