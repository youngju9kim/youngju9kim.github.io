/**
 * 구글 드라이브 연결 상태 — 이 기기(브라우저) 단위 정보.
 *
 * 동기화되는 프로필 데이터에 섞이면 안 되므로 전역 키에 따로 저장한다.
 * 액세스 토큰은 여기 저장하지 않는다(메모리에만 — services/googleDrive 참조).
 */
import { STORAGE_KEYS } from '@constants/storage';
import { storageAdapter } from '@storage/storageAdapter';

export interface DriveState {
  /** 사용자가 이 기기에서 드라이브 연결을 켰는지 */
  enabled: boolean;
  /** 프로필 id → 마지막으로 올린 시각(ISO) */
  lastSyncedAt: Record<string, string>;
}

const DEFAULT_STATE: DriveState = { enabled: false, lastSyncedAt: {} };

function read(): DriveState {
  const result = storageAdapter.read<Partial<DriveState>>(STORAGE_KEYS.drive);
  const stored = result?.data ?? {};
  return {
    enabled: stored.enabled === true,
    lastSyncedAt: stored.lastSyncedAt ?? {},
  };
}

export const driveStateRepository = {
  get: read,

  isEnabled(): boolean {
    return read().enabled;
  },

  setEnabled(enabled: boolean): void {
    storageAdapter.write<DriveState>(STORAGE_KEYS.drive, { ...read(), enabled });
  },

  getLastSyncedAt(profileId: string): string | null {
    return read().lastSyncedAt[profileId] ?? null;
  },

  setLastSyncedAt(profileId: string, syncedAt: string): void {
    const state = read();
    storageAdapter.write<DriveState>(STORAGE_KEYS.drive, {
      ...state,
      lastSyncedAt: { ...state.lastSyncedAt, [profileId]: syncedAt },
    });
  },

  /** 연결 해제 — 마지막 동기화 시각은 남겨 둔다(다시 연결하면 참고) */
  reset(): void {
    storageAdapter.write<DriveState>(STORAGE_KEYS.drive, { ...read(), enabled: false });
  },

  clear(): void {
    storageAdapter.write<DriveState>(STORAGE_KEYS.drive, DEFAULT_STATE);
  },
};
