/**
 * Dialog — FB-002 (03 §19, 02 §16 INT-006).
 * 사용: 삭제, 운동 종료, 초기화, 백업 덮어쓰기 등 명시적 확인이 필요한 파괴적 작업.
 * 규칙: 확인/취소 모두 제공, 버튼 레이블은 동사(예/아니오 금지).
 * 접근성: role=dialog, aria-modal, Escape 로 취소, 열릴 때 확인 버튼 포커스.
 */
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@components/Button/Button';
import { Text } from '@components/Text/Text';
import styles from './Dialog.module.css';

export interface DialogProps {
  open: boolean;
  title: string;
  description?: string;
  /** 확인 버튼 레이블(동사). 예: "삭제", "종료" */
  confirmLabel: string;
  /** 취소 버튼 레이블(동사). 기본 "취소" */
  cancelLabel?: string;
  /** 파괴적 작업이면 확인 버튼을 위험 톤으로 */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** 확인만 받는 대화상자가 아니라 입력이 필요한 경우의 본문(예: 비밀번호 입력) */
  children?: ReactNode;
}

export function Dialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = '취소',
  destructive = false,
  onConfirm,
  onCancel,
  children,
}: DialogProps) {
  const titleId = useId();
  const descId = useId();
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKey);
    confirmRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return createPortal(
    <div className={styles.overlay} onClick={onCancel}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <Text variant="title" as="h2" id={titleId}>
          {title}
        </Text>
        {description ? (
          <Text variant="body" color="secondary" id={descId}>
            {description}
          </Text>
        ) : null}
        {children ? <div className={styles.body}>{children}</div> : null}
        <div className={styles.actions}>
          <Button variant="text" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            ref={confirmRef}
            variant="filled"
            onClick={onConfirm}
            style={destructive ? { background: 'var(--color-error)' } : undefined}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
