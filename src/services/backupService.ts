/**
 * Backup Service — FR-017 백업 / FR-018 복원.
 * 설정·루틴·기록·즐겨찾기를 구조화된 JSON 으로 내보내고, 검증 후 복원한다.
 * 손상/구조 불일치 파일은 복원을 거부하고 기존 데이터를 유지한다(AC, ERR-002).
 */
import { STORAGE_KEYS, STORAGE_SCHEMA_VERSION } from '@constants/storage';
import { storageAdapter } from '@storage/storageAdapter';
import type { Routine } from '@models/routine';
import type { WorkoutRecord } from '@models/workout';
import { settingsRepository, type SettingsData } from '@repositories/settingsRepository';
import { nowISO } from '@utils/datetime';

export interface BackupFile {
  format: 'workout-coach-backup';
  schemaVersion: number;
  exportedAt: string;
  settings: SettingsData;
  routines: Routine[];
  history: WorkoutRecord[];
  favorites: string[];
}

function isBackupFile(value: unknown): value is BackupFile {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    v.format === 'workout-coach-backup' &&
    typeof v.schemaVersion === 'number' &&
    typeof v.settings === 'object' &&
    Array.isArray(v.routines) &&
    Array.isArray(v.history) &&
    Array.isArray(v.favorites)
  );
}

export const backupService = {
  /** 백업 객체 생성 */
  build(): BackupFile {
    return {
      format: 'workout-coach-backup',
      schemaVersion: STORAGE_SCHEMA_VERSION,
      exportedAt: nowISO(),
      settings: settingsRepository.getAll(),
      routines: storageAdapter.read<Routine[]>(STORAGE_KEYS.routines)?.data ?? [],
      history:
        storageAdapter.read<WorkoutRecord[]>(STORAGE_KEYS.history)?.data ?? [],
      favorites: storageAdapter.read<string[]>(STORAGE_KEYS.favorites)?.data ?? [],
    };
  },

  /** 브라우저 다운로드 트리거 (JSON 파일) */
  download(): void {
    const data = JSON.stringify(this.build(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workout-coach-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  /**
   * JSON 문자열을 검증 후 복원. 성공 시 true.
   * 손상/형식 불일치면 false 를 반환하고 기존 데이터를 변경하지 않는다.
   */
  restore(json: string): { ok: boolean; error?: string } {
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      return { ok: false, error: '파일을 읽을 수 없습니다. 올바른 백업 파일인지 확인해 주세요.' };
    }
    if (!isBackupFile(parsed)) {
      return { ok: false, error: '백업 파일 형식이 올바르지 않습니다.' };
    }
    // 검증 통과 → 일괄 교체
    settingsRepository.replaceAll(parsed.settings);
    storageAdapter.write(STORAGE_KEYS.routines, parsed.routines);
    storageAdapter.write(STORAGE_KEYS.history, parsed.history);
    storageAdapter.write(STORAGE_KEYS.favorites, parsed.favorites);
    storageAdapter.remove(STORAGE_KEYS.statistics); // 파생 데이터는 재계산
    return { ok: true };
  },
};
