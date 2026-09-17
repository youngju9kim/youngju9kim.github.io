/**
 * Workout Session / Record 도메인 모델 — 01_PRD FR-005~010, 02_UI_UX SC-004~006.
 *
 * BR-004: 세트는 사용자가 명시적으로 완료한 경우에만 완료로 인정.
 * BR-005: 세션은 모든 운동 종료 + 필수 세트 기록 + 저장 성공 시에만 완료.
 * BR-007: 세트 완료 즉시 저장(일괄 저장 금지) → 비정상 종료 시 손실 최소화.
 */
import type { EntityMeta, RepRange } from './common';

/** 세션 상태 */
export type SessionStatus = 'in-progress' | 'completed' | 'abandoned';

/** 세트 1개의 기록 */
export interface SetRecord {
  /** 1-based 세트 번호 */
  setNumber: number;
  weight: number;
  reps: number;
  /** 볼륨 = weight * reps (파생, 저장은 하되 재계산 가능) */
  volume: number;
  /** 완료 여부(BR-004) */
  completed: boolean;
  /** 완료 시각(ISO) */
  completedAt?: string;
}

/** 세션 내 운동 1개의 진행 상태 */
export interface SessionExercise {
  exerciseId: string;
  order: number;
  /** 목표 세트 수 */
  targetSets: number;
  targetReps: RepRange;
  restSec: number;
  /** 세트 기록들 */
  sets: SetRecord[];
}

/** 진행 중 / 완료된 운동 세션 */
export interface WorkoutSession extends EntityMeta {
  routineId: string;
  routineName: string;
  status: SessionStatus;
  /** 시작 시각(ISO) */
  startedAt: string;
  /** 종료 시각(ISO) — 완료 시 */
  endedAt?: string;
  /** 현재 운동 인덱스(0-based) */
  currentExerciseIndex: number;
  exercises: SessionExercise[];
}

/** 운동 종료 시 계산되는 요약 결과 (FR-010) */
export interface WorkoutSummary {
  /** 총 운동 시간(초) */
  totalDurationSec: number;
  totalExercises: number;
  totalSets: number;
  totalReps: number;
  totalVolume: number;
  /** 이번 세션에서 갱신된 PR 목록 */
  newRecords: PersonalRecordHit[];
}

/** 이번 세션에서 달성한 PR (FR-013) */
export interface PersonalRecordHit {
  exerciseId: string;
  type: 'weight' | 'reps' | 'volume';
  value: number;
}

/**
 * 완료된 운동 기록 (History 저장 단위, FR-011).
 * 세션의 스냅샷 + 계산된 요약.
 */
export interface WorkoutRecord extends EntityMeta {
  routineId: string;
  routineName: string;
  /** 운동 수행 날짜(ISO, 시작 시각 기준) */
  performedAt: string;
  durationSec: number;
  exercises: SessionExercise[];
  summary: WorkoutSummary;
}
