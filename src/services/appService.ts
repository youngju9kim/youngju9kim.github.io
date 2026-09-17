/**
 * App Service — FR-001 최초 실행 / FR-019 초기화 / FR-020 무결성 검사.
 * 앱 시작 시 저장 데이터 구조를 검증하고, 복구 불가한 손상 항목은 안전하게 정리한다.
 */
import { STORAGE_KEYS, STORAGE_NAMESPACE } from '@constants/storage';
import { storageAdapter } from '@storage/storageAdapter';
import { nowISO } from '@utils/datetime';

interface AppState {
  initialized: boolean;
  firstLaunchAt: string;
}

/** 검증 대상: 배열/객체 형태를 기대하는 키들 */
const ARRAY_KEYS = [
  STORAGE_KEYS.routines,
  STORAGE_KEYS.history,
  STORAGE_KEYS.favorites,
];

export const appService = {
  /**
   * 앱 시작 초기화. 최초 실행이면 기본 상태 생성(FR-001),
   * 저장 데이터 무결성 검사 후 손상 항목 정리(FR-020, ERR-003).
   */
  init(): { firstLaunch: boolean } {
    // FR-020: 손상된 데이터 감지 → 자동 정리
    // raw 값이 존재하지만 adapter.read 가 null(구조 손상)인 키를 제거한다.
    for (const key of ARRAY_KEYS) {
      try {
        const raw = localStorage.getItem(key);
        if (raw !== null && storageAdapter.read(key) === null) {
          storageAdapter.remove(key);
        }
      } catch {
        /* 접근 불가 시 무시 */
      }
    }

    const app = storageAdapter.read<AppState>(STORAGE_KEYS.app)?.data;
    if (!app || !app.initialized) {
      storageAdapter.write<AppState>(STORAGE_KEYS.app, {
        initialized: true,
        firstLaunchAt: nowISO(),
      });
      return { firstLaunch: true };
    }
    return { firstLaunch: false };
  },

  /** 최초 실행 여부(온보딩 판단용) */
  isFirstLaunch(): boolean {
    return !storageAdapter.read<AppState>(STORAGE_KEYS.app)?.data?.initialized;
  },

  /**
   * 전체 데이터 초기화 (FR-019). 모든 workoutcoach/* 키 삭제 후 앱 상태 재생성.
   * 호출 전 사용자 확인(Dialog)은 UI 에서 수행한다.
   */
  reset(): void {
    const keys: string[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(`${STORAGE_NAMESPACE}/`)) keys.push(k);
      }
      keys.forEach((k) => localStorage.removeItem(k));
    } catch {
      /* no-op */
    }
    storageAdapter.write<AppState>(STORAGE_KEYS.app, {
      initialized: true,
      firstLaunchAt: nowISO(),
    });
  },
};
