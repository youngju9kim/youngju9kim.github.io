/**
 * IconButton — CMP-003 (03 §15).
 * 규칙: 의미가 불명확한 아이콘 금지, 접근성 레이블 필수(label 필수 prop).
 */
import type { ButtonHTMLAttributes } from 'react';
import { Icon, type IconName } from '@components/Icon/Icon';
import styles from './IconButton.module.css';

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  icon: IconName;
  /** 접근성 레이블 — 필수 (ICON-002) */
  label: string;
  size?: 's' | 'm' | 'l';
  tone?: 'default' | 'on-primary' | 'danger';
  className?: string;
}

export function IconButton({
  icon,
  label,
  size = 'm',
  tone = 'default',
  disabled,
  className,
  type = 'button',
  ...rest
}: IconButtonProps) {
  const classes = [
    styles.iconButton,
    tone === 'on-primary' && styles.onPrimary,
    tone === 'danger' && styles.danger,
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button
      type={type}
      className={classes}
      aria-label={label}
      title={label}
      disabled={disabled}
      {...rest}
    >
      <Icon name={icon} size={size} />
    </button>
  );
}
