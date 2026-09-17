/**
 * EmptyState — EMP-001 / 22. Empty State Component (02 §19, 03 §22).
 * 구성: 일러스트 → 제목 → 설명 → 주요 CTA.
 * 규칙: 부정적 표현 금지, 다음 행동 유도(02 §19).
 */
import type { ReactNode } from 'react';
import { Text } from '@components/Text/Text';
import styles from './EmptyState.module.css';

export interface EmptyStateProps {
  /** 규격 준수 일러스트(05 §13). 없으면 아이콘 등으로 대체 */
  illustration?: ReactNode;
  title: string;
  description?: string;
  /** 주요 CTA (예: 첫 루틴 만들기) */
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  illustration,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={[styles.empty, className].filter(Boolean).join(' ')}>
      {illustration ? (
        <div className={styles.illustration}>{illustration}</div>
      ) : null}
      <Text variant="title" as="h2">
        {title}
      </Text>
      {description ? (
        <Text variant="body" color="secondary">
          {description}
        </Text>
      ) : null}
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}
