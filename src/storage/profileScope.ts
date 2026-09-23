/**
 * 저장 키의 프로필 구분.
 *
 * 기존에는 `workoutcoach/routines` 처럼 전역 키 하나에 모든 데이터가 들어갔다.
 * 프로필이 생기면서 사람별로 나눠 담아야 하므로, storageAdapter 가 키를 읽고 쓸 때
 * 활성 프로필에 맞춰 경로를 바꾼다:
 *
 *   workoutcoach/routines  →  workoutcoach/u/<profileId>/routines
 *
 * 이렇게 하면 Repository 들은 한 줄도 고치지 않아도 된다(07 §10 의 단일 접근 지점 원칙).
 *
 * GLOBAL_KEYS 는 프로필과 무관한 데이터라 그대로 둔다.
 */
import { STORAGE_NAMESPACE } from '@constants/storage';

/** 프로필별로 나누지 않는 키 */
const GLOBAL_KEYS = new Set<string>([
  `${STORAGE_NAMESPACE}/app`, // 앱 초기화 상태
  `${STORAGE_NAMESPACE}/profiles`, // 프로필 목록 자체
  `${STORAGE_NAMESPACE}/active_profile`, // 현재 로그인한 프로필
  `${STORAGE_NAMESPACE}/drive`, // 구글 드라이브 연결 상태(기기 단위)
]);

let activeProfileId: string | null = null;

export const profileScope = {
  get(): string | null {
    return activeProfileId;
  },

  set(profileId: string | null): void {
    activeProfileId = profileId;
  },

  /** 활성 프로필에 맞춘 실제 저장 키를 돌려준다. */
  resolve(key: string): string {
    if (GLOBAL_KEYS.has(key)) return key;
    if (!activeProfileId) return key; // 로그인 전 — 예전 전역 키(마이그레이션 대상)
    const suffix = key.startsWith(`${STORAGE_NAMESPACE}/`)
      ? key.slice(STORAGE_NAMESPACE.length + 1)
      : key;
    return `${STORAGE_NAMESPACE}/u/${activeProfileId}/${suffix}`;
  },

  /** 특정 프로필이 쓰는 모든 키 (삭제·내보내기용) */
  keysOf(profileId: string): string[] {
    const prefix = `${STORAGE_NAMESPACE}/u/${profileId}/`;
    const out: string[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix)) out.push(k);
      }
    } catch {
      /* 저장소 접근 불가 — 빈 목록 */
    }
    return out;
  },
};
