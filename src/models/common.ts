/**
 * 공통 도메인 메타데이터.
 *
 * 근거:
 *  - README §8 "식별자(ID), 생성일, 수정일 등 공통 메타데이터를 포함하는 것을 원칙으로 한다."
 *  - 07_ARCHITECTURE §10 "모든 저장 데이터는 버전 정보를 포함한다."
 *
 * 향후 클라우드 데이터베이스 이전을 고려한 공통 필드다. (README §8, 향후 확장 로드맵 Stage 2)
 */
export interface EntityMeta {
  /** 고유 식별자 */
  id: string;
  /** 생성 시각 (ISO 8601 문자열) */
  createdAt: string;
  /** 마지막 수정 시각 (ISO 8601 문자열) */
  updatedAt: string;
}

/**
 * LocalStorage 에 저장되는 최상위 레코드 래퍼.
 * 저장 시점의 스키마 버전을 함께 기록하여 마이그레이션(ERR-006)에 사용한다.
 */
export interface StoredEnvelope<T> {
  /** STORAGE_SCHEMA_VERSION 값 */
  schemaVersion: number;
  /** 실제 도메인 데이터 */
  data: T;
}

/** 권장/목표 반복 범위 — Exercise·Routine·Workout 에서 공통 사용 */
export interface RepRange {
  min: number;
  max: number;
}
