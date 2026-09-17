/**
 * Snackbar — FB-001 (03 §19, 02 §16 INT-007, Feedback Hierarchy 우선순위 2).
 * 저장 완료/복사/즐겨찾기 등 짧은 피드백. 자동 소멸(기본 2초), 단일 위치.
 * Dialog 와 동시 사용 금지(사용 규칙). 접근성: aria-live=polite 라이브 리전.
 *
 * 사용: 앱 루트를 <SnackbarProvider> 로 감싸고, 컴포넌트에서 useSnackbar().show(...) 호출.
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Icon, type IconName } from '@components/Icon/Icon';
import styles from './Snackbar.module.css';

type SnackbarTone = 'default' | 'success' | 'error';

interface SnackbarState {
  id: number;
  message: string;
  tone: SnackbarTone;
  icon?: IconName;
}

interface ShowOptions {
  tone?: SnackbarTone;
  icon?: IconName;
  /** 표시 시간(ms). 기본 2000 */
  duration?: number;
}

interface SnackbarContextValue {
  show: (message: string, options?: ShowOptions) => void;
}

const SnackbarContext = createContext<SnackbarContextValue | null>(null);

export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<SnackbarState | null>(null);
  const seq = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string, options: ShowOptions = {}) => {
    if (timer.current) clearTimeout(timer.current);
    const id = ++seq.current;
    setCurrent({
      id,
      message,
      tone: options.tone ?? 'default',
      icon: options.icon,
    });
    timer.current = setTimeout(() => {
      setCurrent((c) => (c?.id === id ? null : c));
    }, options.duration ?? 2000);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  const toneClass =
    current?.tone === 'success'
      ? styles.success
      : current?.tone === 'error'
        ? styles.error
        : styles.default;

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      <div className={styles.region} aria-live="polite" aria-atomic="true">
        {current ? (
          <div className={[styles.snackbar, toneClass].join(' ')} role="status">
            {current.icon ? <Icon name={current.icon} size="s" /> : null}
            <span>{current.message}</span>
          </div>
        ) : null}
      </div>
    </SnackbarContext.Provider>
  );
}

export function useSnackbar(): SnackbarContextValue {
  const ctx = useContext(SnackbarContext);
  if (!ctx) {
    throw new Error('useSnackbar 는 <SnackbarProvider> 안에서만 사용할 수 있습니다.');
  }
  return ctx;
}
