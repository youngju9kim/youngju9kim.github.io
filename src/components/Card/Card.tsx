/**
 * Card — CMP-006 (03 §15). 관련 정보를 하나의 시각 단위로 그룹화.
 * interactive=true 이면 전체가 버튼 역할(SCR-003 카드 구조: 제목→정보→액션).
 */
import type { HTMLAttributes } from 'react';
import styles from './Card.module.css';

interface StaticCardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'className'> {
  interactive?: false;
  className?: string;
}

interface InteractiveCardProps
  extends Omit<HTMLAttributes<HTMLButtonElement>, 'className'> {
  interactive: true;
  className?: string;
}

export type CardProps = StaticCardProps | InteractiveCardProps;

export function Card(props: CardProps) {
  if (props.interactive) {
    const { children, className, interactive: _i, ...rest } = props;
    return (
      <button
        type="button"
        className={[styles.card, styles.interactive, className]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      >
        {children}
      </button>
    );
  }
  const { children, className, interactive: _i, ...rest } = props;
  return (
    <div className={[styles.card, className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </div>
  );
}
