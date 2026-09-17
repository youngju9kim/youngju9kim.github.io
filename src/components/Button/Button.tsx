/**
 * Button — CMP-001 Primary / CMP-002 Secondary (03 §15).
 *
 * - variant: filled(Primary CTA) | outlined | text (Secondary).
 * - Usage Rule: 화면당 filled Primary 는 하나만 사용한다(사용처에서 보장).
 * - Loading 상태: 크기 유지 + 중복 클릭 차단(INT/EC-004).
 * - Anti-pattern: 아이콘만 있는 Primary 금지 → 아이콘 버튼은 IconButton 사용.
 */
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Icon, type IconName } from '@components/Icon/Icon';
import styles from './Button.module.css';

export type ButtonVariant = 'filled' | 'outlined' | 'text';

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  variant?: ButtonVariant;
  /** 화면 하단 주요 CTA: 가로 꽉 채움 */
  fullWidth?: boolean;
  /** 주요 CTA 높이(56px) */
  cta?: boolean;
  /** 저장/전송 등 진행 상태. true면 스피너 표시 + 클릭 차단 */
  loading?: boolean;
  /** 레이블 왼쪽 아이콘(선택). 레이블 없는 아이콘 전용 버튼은 금지 */
  leftIcon?: IconName;
  children: ReactNode;
  className?: string;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  filled: styles.filled,
  outlined: styles.outlined,
  text: styles.text,
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'filled',
    fullWidth = false,
    cta = false,
    loading = false,
    leftIcon,
    children,
    disabled,
    className,
    onClick,
    type = 'button',
    ...rest
  },
  ref,
) {
  const classes = [
    styles.button,
    VARIANT_CLASS[variant],
    fullWidth && styles.fullWidth,
    cta && styles.cta,
    loading && styles.loading,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      onClick={loading ? undefined : onClick}
      {...rest}
    >
      {loading ? (
        <span className={styles.spinner} aria-hidden="true" />
      ) : leftIcon ? (
        <Icon name={leftIcon} size="s" />
      ) : null}
      {children}
    </button>
  );
});
