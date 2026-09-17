/**
 * ListItem — CMP-007 (03 §15). Leading · Title/Subtitle · Trailing.
 * onClick 이 있으면 버튼으로 렌더(키보드 탐색 지원). Long Press 의존 금지(INT-002).
 */
import type { ReactNode } from 'react';
import styles from './ListItem.module.css';

export interface ListItemProps {
  title: ReactNode;
  subtitle?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  className?: string;
  'aria-label'?: string;
}

export function ListItem({
  title,
  subtitle,
  leading,
  trailing,
  onClick,
  className,
  'aria-label': ariaLabel,
}: ListItemProps) {
  const interactive = Boolean(onClick);
  const content = (
    <>
      {leading ? <span className={styles.leading}>{leading}</span> : null}
      <span className={styles.body}>
        <span className={styles.title}>{title}</span>
        {subtitle ? <span className={styles.subtitle}>{subtitle}</span> : null}
      </span>
      {trailing ? <span className={styles.trailing}>{trailing}</span> : null}
    </>
  );

  const classes = [styles.item, interactive && styles.interactive, className]
    .filter(Boolean)
    .join(' ');

  if (interactive) {
    return (
      <button
        type="button"
        className={classes}
        onClick={onClick}
        aria-label={ariaLabel}
      >
        {content}
      </button>
    );
  }
  return (
    <li className={classes} aria-label={ariaLabel}>
      {content}
    </li>
  );
}
