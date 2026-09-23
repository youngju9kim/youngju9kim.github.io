/**
 * LocalStorage 키 구조 (Single Source of Truth)
 *
 * 근거 문서:
 *  - 06_DEVELOPMENT_GUIDE §11 LocalStorage Architecture
 *  - 07_ARCHITECTURE §10 Storage Architecture
 *  - 08_MASTER_PROMPT RULE-009 "LocalStorage 구조를 임의 변경하지 않는다"
 *
 * ⚠️ 이 키들은 절대 변경하지 않는다. 데이터 구조 변경 시에는
 *    STORAGE_SCHEMA_VERSION 을 올리고 마이그레이션 정책을 적용한다.
 *
 * Storage Key 명명 규칙: snake_case (06_DEVELOPMENT_GUIDE §7)
 */

/** 모든 저장 키의 공통 접두사 */
export const STORAGE_NAMESPACE = 'workoutcoach';

/**
 * 저장 영역 키.
 * 06_DEVELOPMENT_GUIDE §11 의 구조를 그대로 따른다:
 *   workoutcoach/{app, settings, exercises, routines, sessions, history, statistics, favorites}
 */
export const STORAGE_KEYS = {
  /** 앱 상태: 초기화 여부, 데이터 버전, 전역 상태 (FR-001) */
  app: `${STORAGE_NAMESPACE}/app`,
  /** 사용자 설정: 단위, 기본 휴식 시간, 테마, 알림 (FR-002) */
  settings: `${STORAGE_NAMESPACE}/settings`,
  /** 운동 마스터 데이터 (04_EXERCISE_DATABASE) */
  exercises: `${STORAGE_NAMESPACE}/exercises`,
  /** 사용자 루틴 (FR-003, FR-004, FR-016) */
  routines: `${STORAGE_NAMESPACE}/routines`,
  /** 진행 중 / 복구 대상 운동 세션 (FR-005 ~ FR-009, EC-001) */
  sessions: `${STORAGE_NAMESPACE}/sessions`,
  /** 완료된 운동 기록 (FR-010, FR-011) */
  history: `${STORAGE_NAMESPACE}/history`,
  /** 통계 캐시 — 재생성 가능한 파생 데이터 (FR-014) */
  statistics: `${STORAGE_NAMESPACE}/statistics`,
  /** 즐겨찾기 루틴 (FR-015) */
  favorites: `${STORAGE_NAMESPACE}/favorites`,
  /** 프로필 목록 — 프로필 구분 대상이 아닌 전역 키 (storage/profileScope) */
  profiles: `${STORAGE_NAMESPACE}/profiles`,
  /** 현재 로그인한 프로필 id — 전역 키 */
  activeProfile: `${STORAGE_NAMESPACE}/active_profile`,
  /**
   * 구글 드라이브 연결 상태 — 이 기기(브라우저) 단위라 전역 키.
   * 동기화되는 데이터에 섞이면 안 되므로 프로필 폴더 밖에 둔다.
   */
  drive: `${STORAGE_NAMESPACE}/drive`,
} as const;

export type StorageKey = keyof typeof STORAGE_KEYS;

/**
 * 저장 데이터 스키마 버전.
 * 07_ARCHITECTURE §10: "모든 저장 데이터는 버전 정보를 포함한다."
 * 구조 변경 시 이 값을 올리고 Storage Adapter 에서 마이그레이션(ERR-006)을 수행한다.
 */
export const STORAGE_SCHEMA_VERSION = 1;
