/**
 * 로그인 상태 Context.
 *
 * 앱이 뜰 때 저장된 로그인 상태를 복원하고(restoreSession), 프로필 도입 이전의
 * 데이터가 남아 있으면 첫 프로필로 옮긴다(migrateLegacyData).
 * 저장 키가 프로필별로 갈리므로, 로그인/로그아웃 시 화면 데이터를 다시 읽도록
 * key 를 바꿔 하위 트리를 새로 마운트한다.
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Profile } from '@models/profile';
import { authService } from '@services/authService';
import { profileRepository } from '@repositories/profileRepository';

interface AuthContextValue {
  profile: Profile | null;
  /** 로그인 완료 후 호출 */
  signIn: (profile: Profile) => void;
  signOut: () => void;
  /** 프로필 정보(이름 등)가 바뀐 뒤 화면 갱신용 */
  refresh: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** 앱 시작 시 1회 — 세션 복원 + 레거시 데이터 이전 */
function initialProfile(): Profile | null {
  authService.migrateLegacyData();
  return authService.restoreSession();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(initialProfile);

  /**
   * 로그인 확정. 여기서 활성 프로필을 반드시 저장한다 —
   * 이걸 빠뜨리면 profileScope 가 비어 데이터가 프로필 폴더가 아닌
   * 예전 전역 키로 새어 나간다(프로필 생성 직후 실제로 발생했던 문제).
   */
  const signIn = useCallback((next: Profile) => {
    profileRepository.setActiveId(next.id);
    setProfile(next);
  }, []);

  const signOut = useCallback(() => {
    authService.logout();
    setProfile(null);
  }, []);

  const refresh = useCallback(() => {
    const id = profileRepository.getActiveId();
    setProfile(id ? (profileRepository.getById(id) ?? null) : null);
  }, []);

  const value = useMemo(
    () => ({ profile, signIn, signOut, refresh }),
    [profile, signIn, signOut, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth 는 AuthProvider 안에서만 사용할 수 있습니다.');
  return ctx;
}
