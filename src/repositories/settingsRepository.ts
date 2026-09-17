/**
 * Settings Repository — 07_ARCHITECTURE §9, 06_DEVELOPMENT_GUIDE §13.
 * 사용자 설정(FR-002)의 데이터 접근 계층. LocalStorage 접근은 storageAdapter 로 캡슐화.
 */
import { STORAGE_KEYS } from '@constants/storage';
import { storageAdapter } from '@storage/storageAdapter';

export type ThemePreference = 'light' | 'dark' | 'system';
export type WeightUnit = 'kg' | 'lb';

/**
 * 운동별 영상 오버라이드. 사용자가 유튜브 URL 을 지정하면 내장 영상 대신 이를 재생한다.
 * startSec~endSec 로 3~10초 구간을 지정할 수 있다(미지정 시 처음부터).
 */
export interface VideoOverride {
  youtubeUrl: string;
  startSec?: number;
  endSec?: number;
}

/** settings 저장 영역의 형태 */
export interface SettingsData {
  theme: ThemePreference;
  /** 중량 표시 단위 (FR-002). 값은 그대로 저장하고 라벨만 바뀐다(변환 없음). */
  unit: WeightUnit;
  /** 기본 휴식 시간(초) — 새 루틴 생성 시 기본값 (FR-002) */
  defaultRestSec: number;
  /** 홈 인사말에 표시할 이름(선택). 빈 값이면 이름 없이 인사. */
  userName: string;
  /** 운동 ID → 영상 오버라이드(유튜브) */
  videoOverrides: Record<string, VideoOverride>;
}

export const DEFAULT_SETTINGS: SettingsData = {
  theme: 'system',
  unit: 'kg',
  defaultRestSec: 90,
  userName: '',
  videoOverrides: {},
};

function readAll(): SettingsData {
  const result = storageAdapter.read<Partial<SettingsData>>(
    STORAGE_KEYS.settings,
  );
  return { ...DEFAULT_SETTINGS, ...(result?.data ?? {}) };
}

function writeMerge(patch: Partial<SettingsData>): void {
  storageAdapter.write<SettingsData>(STORAGE_KEYS.settings, {
    ...readAll(),
    ...patch,
  });
}

export const settingsRepository = {
  getAll: readAll,

  getTheme(): ThemePreference {
    return readAll().theme;
  },
  setTheme(theme: ThemePreference): void {
    writeMerge({ theme });
  },

  getUnit(): WeightUnit {
    return readAll().unit;
  },
  setUnit(unit: WeightUnit): void {
    writeMerge({ unit });
  },

  getDefaultRestSec(): number {
    return readAll().defaultRestSec;
  },
  setDefaultRestSec(defaultRestSec: number): void {
    writeMerge({ defaultRestSec });
  },

  getUserName(): string {
    return readAll().userName;
  },
  setUserName(userName: string): void {
    writeMerge({ userName });
  },

  getVideoOverride(exerciseId: string): VideoOverride | undefined {
    return readAll().videoOverrides[exerciseId];
  },
  /** override 저장. null 이면 해당 운동 오버라이드를 제거(내장/일러스트로 복귀). */
  setVideoOverride(exerciseId: string, override: VideoOverride | null): void {
    const next = { ...readAll().videoOverrides };
    if (override && override.youtubeUrl.trim()) next[exerciseId] = override;
    else delete next[exerciseId];
    writeMerge({ videoOverrides: next });
  },

  /** 설정 일괄 교체(복원 시 사용) */
  replaceAll(settings: SettingsData): void {
    storageAdapter.write<SettingsData>(STORAGE_KEYS.settings, settings);
  },
};
