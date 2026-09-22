/**
 * Profile Repository — 프로필 목록과 로그인 상태의 데이터 접근 계층.
 *
 * 프로필 목록·활성 프로필은 프로필 구분 대상이 아닌 전역 키에 저장한다(storage/profileScope).
 * 프로필별 운동 데이터는 기존 Repository 들이 그대로 담당한다.
 */
import type { Profile } from '@models/profile';
import { STORAGE_KEYS } from '@constants/storage';
import { storageAdapter } from '@storage/storageAdapter';
import { profileScope } from '@storage/profileScope';

function readList(): Profile[] {
  const result = storageAdapter.read<Profile[]>(STORAGE_KEYS.profiles);
  return Array.isArray(result?.data) ? result.data : [];
}

function writeList(profiles: Profile[]): boolean {
  return storageAdapter.write(STORAGE_KEYS.profiles, profiles);
}

export const profileRepository = {
  getAll(): Profile[] {
    // 최근 로그인 순 → 이름 순
    return readList().slice().sort((a, b) => {
      if (a.lastLoginAt && b.lastLoginAt) return b.lastLoginAt.localeCompare(a.lastLoginAt);
      if (a.lastLoginAt) return -1;
      if (b.lastLoginAt) return 1;
      return a.name.localeCompare(b.name);
    });
  },

  getById(id: string): Profile | undefined {
    return readList().find((p) => p.id === id);
  },

  /** 같은 이름이 이미 있는지 (대소문자·공백 무시) */
  nameTaken(name: string, exceptId?: string): boolean {
    const key = name.trim().replace(/\s+/g, '').toLowerCase();
    return readList().some(
      (p) => p.id !== exceptId && p.name.trim().replace(/\s+/g, '').toLowerCase() === key,
    );
  },

  save(profile: Profile): boolean {
    const list = readList();
    const i = list.findIndex((p) => p.id === profile.id);
    if (i >= 0) list[i] = profile;
    else list.push(profile);
    return writeList(list);
  },

  /** 프로필과 그 프로필의 모든 운동 데이터를 함께 지운다. */
  remove(id: string): void {
    writeList(readList().filter((p) => p.id !== id));
    for (const key of profileScope.keysOf(id)) {
      try {
        localStorage.removeItem(key);
      } catch {
        /* no-op */
      }
    }
    if (this.getActiveId() === id) this.setActiveId(null);
  },

  getActiveId(): string | null {
    const result = storageAdapter.read<string>(STORAGE_KEYS.activeProfile);
    return typeof result?.data === 'string' ? result.data : null;
  },

  setActiveId(id: string | null): void {
    if (id === null) storageAdapter.remove(STORAGE_KEYS.activeProfile);
    else storageAdapter.write(STORAGE_KEYS.activeProfile, id);
    profileScope.set(id);
  },
};
