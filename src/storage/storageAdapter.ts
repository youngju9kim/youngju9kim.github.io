/**
 * Storage Adapter — 07_ARCHITECTURE §10, 06_DEVELOPMENT_GUIDE §11.
 *
 * LocalStorage API 를 추상화하는 유일한 지점이다. 상위 계층(Repository)만 이를 사용하며,
 * UI/Service 는 직접 접근하지 않는다. 저장 방식 교체(IndexedDB/Cloud) 시 여기만 바꾼다.
 *
 * 원칙(07 §10, FR-020):
 *  - 모든 저장 데이터는 스키마 버전을 포함(StoredEnvelope).
 *  - 저장 실패/손상 시 앱이 비정상 종료되지 않는다(예외를 삼키고 안전값 반환).
 *  - 손상된 데이터는 감지 후 상위 계층이 복구/초기화하도록 null 을 반환한다.
 */
import { STORAGE_SCHEMA_VERSION } from '@constants/storage';
import type { StoredEnvelope } from '@models/common';

function isStorageAvailable(): boolean {
  try {
    return typeof localStorage !== 'undefined';
  } catch {
    return false;
  }
}

export const storageAdapter = {
  /**
   * 키의 데이터를 읽는다.
   * 값이 없거나 JSON 손상/구조 불일치면 null 을 반환한다(ERR-003 대상).
   * schemaVersion 이 현재보다 낮으면 needsMigration=true 로 알린다.
   */
  read<T>(key: string): { data: T; needsMigration: boolean } | null {
    if (!isStorageAvailable()) return null;
    let raw: string | null;
    try {
      raw = localStorage.getItem(key);
    } catch {
      return null;
    }
    if (raw === null) return null;
    try {
      const parsed = JSON.parse(raw) as StoredEnvelope<T>;
      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        !('schemaVersion' in parsed) ||
        !('data' in parsed)
      ) {
        return null; // 구조 손상 → 상위 계층이 처리
      }
      return {
        data: parsed.data,
        needsMigration: parsed.schemaVersion < STORAGE_SCHEMA_VERSION,
      };
    } catch {
      return null; // JSON 손상
    }
  },

  /** 현재 스키마 버전으로 감싸 저장한다. 실패 시 false. */
  write<T>(key: string, data: T): boolean {
    if (!isStorageAvailable()) return false;
    try {
      const envelope: StoredEnvelope<T> = {
        schemaVersion: STORAGE_SCHEMA_VERSION,
        data,
      };
      localStorage.setItem(key, JSON.stringify(envelope));
      return true;
    } catch {
      return false; // QuotaExceeded 등 (ERR-001)
    }
  },

  remove(key: string): void {
    if (!isStorageAvailable()) return;
    try {
      localStorage.removeItem(key);
    } catch {
      /* no-op */
    }
  },
};
