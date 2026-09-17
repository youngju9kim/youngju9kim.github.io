/**
 * BottomSheet — FB-003 (03 §19, 02 §16 INT-008).
 * 현재 작업 맥락을 유지한 채 추가 선택지 제공(운동 선택, 필터, 정렬).
 * 전체 화면을 덮지 않으며 닫기 버튼 + 외부 터치/드래그로 닫기 지원.
 */
import { useEffect, useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { IconButton } from '@components/IconButton/IconButton';
import { Text } from '@components/Text/Text';
import styles from './BottomSheet.module.css';

export interface BottomSheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** 화면 대부분을 차지하는 확장형(운동 검색 등) */
  expanded?: boolean;
}

export function BottomSheet({
  open,
  title,
  onClose,
  children,
  expanded = false,
}: BottomSheetProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={[styles.sheet, expanded && styles.expanded]
          .filter(Boolean)
          .join(' ')}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.grabber} aria-hidden="true" />
        <div className={styles.header}>
          <Text variant="title" as="h2" id={titleId}>
            {title}
          </Text>
          <IconButton icon="close" label="닫기" onClick={onClose} />
        </div>
        <div className={styles.content}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}
