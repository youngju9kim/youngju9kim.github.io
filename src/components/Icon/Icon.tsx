/**
 * Icon — 03_DESIGN_SYSTEM §12 Icon System, 05_IMAGE_STYLE_GUIDE §11.
 *
 * 원칙:
 *  - Outline(line) 기반 단일 스타일, currentColor 상속(테마 자동 대응).
 *  - ICON-002: 아이콘 단독으로 의미 전달 금지 → 항상 title/aria-label 또는
 *    함께 표시되는 텍스트와 병행한다. (사용처 컴포넌트에서 보장)
 */
import type { CSSProperties } from 'react';

export type IconName =
  | 'home'
  | 'history'
  | 'statistics'
  | 'settings'
  | 'play'
  | 'pause'
  | 'stop'
  | 'plus'
  | 'minus'
  | 'edit'
  | 'delete'
  | 'favorite'
  | 'favorite-filled'
  | 'search'
  | 'timer'
  | 'trophy'
  | 'warning'
  | 'success'
  | 'info'
  | 'error'
  | 'check'
  | 'close'
  | 'chevron-left'
  | 'chevron-right'
  | 'sun'
  | 'moon';

/** 24x24 viewBox 기준 path 데이터 (stroke 기반, 일부 fill) */
const PATHS: Record<IconName, JSX.Element> = {
  home: (
    <path d="M3 10.5 12 3l9 7.5M5 9.5V20h5v-6h4v6h5V9.5" />
  ),
  history: (
    <>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 4v4h4" />
      <path d="M12 8v4l3 2" />
    </>
  ),
  statistics: (
    <>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1" />
    </>
  ),
  play: <path d="M7 5v14l11-7z" />,
  pause: <path d="M8 5v14M16 5v14" />,
  stop: <rect x="6" y="6" width="12" height="12" rx="1.5" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  edit: (
    <>
      <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3z" />
      <path d="M13.5 6.5l3 3" />
    </>
  ),
  delete: (
    <>
      <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
    </>
  ),
  favorite: (
    <path d="M12 20s-7-4.6-9.2-9A4.4 4.4 0 0 1 12 6a4.4 4.4 0 0 1 9.2 5C19 15.4 12 20 12 20z" />
  ),
  'favorite-filled': (
    <path
      d="M12 20s-7-4.6-9.2-9A4.4 4.4 0 0 1 12 6a4.4 4.4 0 0 1 9.2 5C19 15.4 12 20 12 20z"
      fill="currentColor"
      stroke="none"
    />
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </>
  ),
  timer: (
    <>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 13V9M9 2h6" />
    </>
  ),
  trophy: (
    <>
      <path d="M7 4h10v4a5 5 0 0 1-10 0V4z" />
      <path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3M9 20h6M12 13v4" />
    </>
  ),
  warning: (
    <>
      <path d="M12 3 2 20h20L12 3z" />
      <path d="M12 10v4M12 17h.01" />
    </>
  ),
  success: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.5 2.5L16 9.5" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  error: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6M12 16h.01" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  'chevron-left': <path d="M15 5l-7 7 7 7" />,
  'chevron-right': <path d="M9 5l7 7-7 7" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" />
    </>
  ),
  moon: <path d="M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5z" />,
};

const SIZE_MAP = {
  s: 20,
  m: 24,
  l: 32,
  xl: 48,
} as const;

export interface IconProps {
  name: IconName;
  /** Icon-S/M/L/XL (05 §11) */
  size?: keyof typeof SIZE_MAP;
  /** 접근성 레이블. 지정 시 img role, 미지정 시 장식으로 간주(aria-hidden) */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

export function Icon({ name, size = 'm', label, className, style }: IconProps) {
  const px = SIZE_MAP[size];
  const decorative = !label;
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative ? true : undefined}
      aria-label={label}
      focusable="false"
    >
      {label ? <title>{label}</title> : null}
      {PATHS[name]}
    </svg>
  );
}
