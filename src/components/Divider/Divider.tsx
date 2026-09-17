/**
 * Divider — CMP-010 (03 §13). 섹션 간 구분에 우선 사용, 카드 내부 최소 사용.
 */
import styles from './Divider.module.css';

export interface DividerProps {
  /** 세로 구분선 */
  vertical?: boolean;
  className?: string;
}

export function Divider({ vertical = false, className }: DividerProps) {
  return (
    <hr
      className={[
        styles.divider,
        vertical ? styles.vertical : styles.horizontal,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-orientation={vertical ? 'vertical' : 'horizontal'}
    />
  );
}
