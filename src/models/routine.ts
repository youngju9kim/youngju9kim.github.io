/**
 * Routine 도메인 모델 — 01_PRD FR-003/004, 02_UI_UX SC-002/003.
 * 여러 운동을 순서대로 구성한 운동 프로그램.
 */
import type { EntityMeta, RepRange } from './common';

/** 루틴 내 개별 운동 구성 */
export interface RoutineExercise {
  /** Exercise 마스터 참조 ID */
  exerciseId: string;
  /** 루틴 내 순서(0-based) */
  order: number;
  /** 세트 수 */
  sets: number;
  /** 목표 반복 범위 */
  targetReps: RepRange;
  /** 세트 간 휴식(초) */
  restSec: number;
}

/** 운동 루틴 */
export interface Routine extends EntityMeta {
  name: string;
  description?: string;
  /** 예상 소요 시간(분) — 파생 계산값을 캐시 */
  estimatedDurationMin: number;
  exercises: RoutineExercise[];
  /** 생성 방식: 자동 생성 | 사용자 편집 */
  source: 'generated' | 'custom';
}
