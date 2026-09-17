/**
 * useTheme / ThemeProvider — 03_DESIGN_SYSTEM §6, FR-002(다크 모드).
 *
 * 사용자 선택('light'|'dark') 또는 시스템 설정('system')을 따른다.
 * 실제 적용은 <html data-theme="light|dark"> 로 하며, 'system' 이면 OS 설정을 읽어 변환한다.
 * 테마 전환 시 레이아웃/컴포넌트 구조는 변경되지 않는다(03 §6).
 *
 * 지속성: settingsRepository → storageAdapter (UI 는 LocalStorage 에 직접 접근하지 않음).
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  settingsRepository,
  type ThemePreference,
} from '@repositories/settingsRepository';

type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
  /** 사용자 선호(light|dark|system) */
  preference: ThemePreference;
  /** 실제 적용된 테마(system 해석 결과) */
  resolved: ResolvedTheme;
  setPreference: (pref: ThemePreference) => void;
  /** light ↔ dark 간편 토글(system 이면 현재 해석값 기준 반대로) */
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function resolve(pref: ThemePreference): ResolvedTheme {
  return pref === 'system' ? getSystemTheme() : pref;
}

function applyTheme(resolved: ResolvedTheme) {
  document.documentElement.setAttribute('data-theme', resolved);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() =>
    settingsRepository.getTheme(),
  );
  const [resolved, setResolved] = useState<ResolvedTheme>(() =>
    resolve(preference),
  );

  // 선호가 바뀌면 해석값 갱신 + <html> 적용 + 저장
  useEffect(() => {
    const next = resolve(preference);
    setResolved(next);
    applyTheme(next);
  }, [preference]);

  // 'system' 모드에서 OS 테마 변경 실시간 반영
  useEffect(() => {
    if (preference !== 'system' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const next = getSystemTheme();
      setResolved(next);
      applyTheme(next);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [preference]);

  const setPreference = useCallback((pref: ThemePreference) => {
    settingsRepository.setTheme(pref);
    setPreferenceState(pref);
  }, []);

  const toggle = useCallback(() => {
    setPreference(resolve(preference) === 'dark' ? 'light' : 'dark');
  }, [preference, setPreference]);

  const value = useMemo<ThemeContextValue>(
    () => ({ preference, resolved, setPreference, toggle }),
    [preference, resolved, setPreference, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme 는 <ThemeProvider> 안에서만 사용할 수 있습니다.');
  }
  return ctx;
}
