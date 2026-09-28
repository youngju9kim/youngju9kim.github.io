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

/** 운동 목적 */
export type WorkoutGoal = 'full-body' | 'upper' | 'lower' | 'core';

/**
 * 운동 장소 — 쓸 수 있는 기구가 달라진다.
 *  gym  : 머신·케이블 포함 전부
 *  home : 기구 없이 하는 맨몸 운동만
 */
export type Equipment = 'gym' | 'home';

/** 루틴을 자동 생성할 때 쓴 조건. 저장해 두면 같은 조건으로 다시 뽑을 수 있다. */
export interface RoutineRecipe {
  goal: WorkoutGoal;
  equipment: Equipment;
  targetMinutes: number;
  frequencyPerWeek?: number;
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
  /** 자동 생성된 루틴이 어떤 조건으로 만들어졌는지(다시 뽑기·표시용) */
  recipe?: RoutineRecipe;
}
