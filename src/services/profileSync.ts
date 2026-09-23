/**
 * Profile Sync — 프로필 하나를 사용자 본인의 구글 드라이브에 저장하고 되가져온다.
 *
 * 드라이브에는 프로필당 파일 하나가 생긴다:  WorkoutCoach/profile-<id>.json
 * 파일에는 프로필 정보(이름, PIN 해시, 보안질문 해시)와 그 프로필의 모든 운동 데이터가 들어간다.
 * 평문 비밀번호는 어디에도 없다. 이 파일은 사용자 드라이브에만 있고 우리는 보관하지 않는다.
 *
 * 저장 데이터는 파싱하지 않고 localStorage 의 원본 문자열(봉투 포함)을 그대로 담는다.
 * 중간에서 구조를 해석하지 않으므로 스키마가 바뀌어도 동기화가 깨지지 않는다.
 *
 * 충돌 처리: 마지막에 저장한 쪽이 이긴다(last-write-wins). 다만 덮어쓰기 전에
 * 양쪽 시각을 비교해 더 오래된 것으로 덮어쓰려 하면 호출한 화면이 사용자에게 확인을 받는다.
 */
import type { Profile } from '@models/profile';
import { STORAGE_NAMESPACE, STORAGE_SCHEMA_VERSION } from '@constants/storage';
import { profileRepository } from '@repositories/profileRepository';
import { profileScope } from '@storage/profileScope';
import { googleDrive, DriveError } from '@services/googleDrive';
import { nowISO } from '@utils/datetime';

const FORMAT = 'workout-coach-profile';

export interface ProfileSnapshot {
  format: typeof FORMAT;
  schemaVersion: number;
  syncedAt: string;
  profile: Profile;
  /** 저장 영역 이름 → localStorage 원본 문자열 */
  areas: Record<string, string>;
}

function fileNameFor(profileId: string): string {
  return `profile-${profileId}.json`;
}

function isSnapshot(value: unknown): value is ProfileSnapshot {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    v.format === FORMAT &&
    typeof v.syncedAt === 'string' &&
    typeof v.profile === 'object' &&
    v.profile !== null &&
    typeof (v.profile as Profile).id === 'string' &&
    typeof v.areas === 'object' &&
    v.areas !== null
  );
}

/** 프로필의 모든 데이터를 한 덩어리로 묶는다. */
export function buildSnapshot(profileId: string): ProfileSnapshot | null {
  const profile = profileRepository.getById(profileId);
  if (!profile) return null;

  const areas: Record<string, string> = {};
  const prefix = `${STORAGE_NAMESPACE}/u/${profileId}/`;
  for (const key of profileScope.keysOf(profileId)) {
    const raw = localStorage.getItem(key);
    if (raw !== null) areas[key.slice(prefix.length)] = raw;
  }

  return {
    format: FORMAT,
    schemaVersion: STORAGE_SCHEMA_VERSION,
    syncedAt: nowISO(),
    profile,
    areas,
  };
}

/**
 * 스냅샷을 이 기기에 적용한다. 같은 프로필이 이미 있으면 덮어쓴다.
 * 통계는 파생 데이터라 지우고 다시 계산하게 둔다.
 */
export function applySnapshot(snapshot: ProfileSnapshot): void {
  const { profile, areas } = snapshot;
  profileRepository.save(profile);

  // 기존 데이터를 먼저 비우고 새로 쓴다(드라이브에서 지워진 항목이 남지 않도록).
  for (const key of profileScope.keysOf(profile.id)) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* no-op */
    }
  }
  for (const [area, raw] of Object.entries(areas)) {
    if (area === 'statistics') continue; // 파생 데이터 — 재계산
    try {
      localStorage.setItem(`${STORAGE_NAMESPACE}/u/${profile.id}/${area}`, raw);
    } catch {
      /* 용량 초과 등 — 나머지는 계속 */
    }
  }
}

export interface RemoteProfile {
  fileId: string;
  profile: Profile;
  syncedAt: string;
  /** 이 기기에도 같은 프로필이 있는지 */
  existsLocally: boolean;
}

export const profileSync = {
  /** 드라이브에 올린다. */
  async upload(profileId: string): Promise<{ syncedAt: string }> {
    const snapshot = buildSnapshot(profileId);
    if (!snapshot) throw new DriveError('프로필을 찾을 수 없습니다.');
    const folderId = await googleDrive.ensureFolder();
    await googleDrive.writeFile(
      folderId,
      fileNameFor(profileId),
      JSON.stringify(snapshot),
    );
    return { syncedAt: snapshot.syncedAt };
  },

  /** 드라이브에 있는 프로필 목록 — 기기를 옮겼을 때 여기서 골라 가져온다. */
  async listRemote(): Promise<RemoteProfile[]> {
    const folderId = await googleDrive.ensureFolder();
    const files = await googleDrive.listFiles(folderId);
    const out: RemoteProfile[] = [];

    for (const file of files) {
      if (!file.name.startsWith('profile-')) continue;
      try {
        const parsed: unknown = JSON.parse(await googleDrive.readFile(file.id));
        if (!isSnapshot(parsed)) continue;
        out.push({
          fileId: file.id,
          profile: parsed.profile,
          syncedAt: parsed.syncedAt,
          existsLocally: profileRepository.getById(parsed.profile.id) !== undefined,
        });
      } catch {
        // 손상된 파일 하나 때문에 전체가 실패하지 않게 건너뛴다.
      }
    }
    return out;
  },

  /** 드라이브에서 받아 이 기기에 적용한다. */
  async download(fileId: string): Promise<Profile> {
    const parsed: unknown = JSON.parse(await googleDrive.readFile(fileId));
    if (!isSnapshot(parsed)) {
      throw new DriveError('드라이브의 파일을 읽을 수 없습니다. 형식이 올바르지 않습니다.');
    }
    applySnapshot(parsed);
    return parsed.profile;
  },

  /**
   * 올리기 전 확인용 — 드라이브 쪽이 더 최신이면 시각을 돌려준다.
   * (다른 기기에서 운동한 뒤 이 기기의 오래된 데이터로 덮어쓰는 사고 방지)
   */
  async remoteNewerThan(profileId: string, localUpdatedAt: string): Promise<string | null> {
    try {
      const folderId = await googleDrive.ensureFolder();
      const file = (await googleDrive.listFiles(folderId)).find(
        (f) => f.name === fileNameFor(profileId),
      );
      if (!file) return null;
      const parsed: unknown = JSON.parse(await googleDrive.readFile(file.id));
      if (!isSnapshot(parsed)) return null;
      return parsed.syncedAt > localUpdatedAt ? parsed.syncedAt : null;
    } catch {
      return null; // 확인에 실패하면 막지 않는다(업로드 자체에서 다시 오류 처리)
    }
  },
};
