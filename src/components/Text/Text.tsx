/**
 * Text — 타이포그래피 역할(03 §7.2)을 시맨틱하게 적용하는 컴포넌트.
 * 임의 폰트 크기 사용을 막고(TYPO-002) 역할 기반으로만 텍스트를 표현한다.
 */
import type { ElementType, ReactNode, CSSProperties } from 'react';
import styles from './Text.module.css';

export type TextVariant =
  | 'display'
  | 'headline'
  | 'title'
  | 'body-large'
  | 'body'
  | 'body-small'
  | 'label'
  | 'caption';

export type TextColor =
  | 'primary'
  | 'secondary'
  | 'on-primary'
  | 'success'
  | 'warning'
  | 'error';

const VARIANT_CLASS: Record<TextVariant, string> = {
  display: styles.display,
  headline: styles.headline,
  title: styles.title,
  'body-large': styles.bodyLarge,
  body: styles.body,
  'body-small': styles.bodySmall,
  label: styles.label,
  caption: styles.caption,
};

const COLOR_CLASS: Record<TextColor, string> = {
  primary: styles.primary,
  secondary: styles.secondary,
  'on-primary': styles.onPrimary,
  success: styles.success,
  warning: styles.warning,
  error: styles.error,
};

/** 역할별 기본 시맨틱 태그 */
const DEFAULT_TAG: Record<TextVariant, ElementType> = {
  display: 'h1',
  headline: 'h1',
  title: 'h2',
  'body-large': 'p',
  body: 'p',
  'body-small': 'p',
  label: 'span',
  caption: 'span',
};

export interface TextProps {
  variant?: TextVariant;
  color?: TextColor;
  /** 기본 시맨틱 태그를 재정의 */
  as?: ElementType;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  id?: string;
}

export function Text({
  variant = 'body',
  color = 'primary',
  as,
  children,
  className,
  style,
  id,
}: TextProps) {
  const Tag = as ?? DEFAULT_TAG[variant];
  const classes = [VARIANT_CLASS[variant], COLOR_CLASS[color], className]
    .filter(Boolean)
    .join(' ');
  return (
    <Tag className={classes} style={style} id={id}>
      {children}
    </Tag>
  );
}
