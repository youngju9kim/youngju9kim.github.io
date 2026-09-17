/**
 * Statistics / PR 도메인 모델 — 01_PRD FR-013/014.
 * 통계는 파생(캐시) 데이터로 관리한다(07 SEC-001 Derived Data). 저장 기록과 항상 일치.
 */

/** 운동별 개인 최고 기록 (BR-006: 동일 운동 내에서만 비교) */
export interface PersonalRecord {
  exerciseId: string;
  maxWeight: number;
  maxReps: number;
  maxVolume: number;
  /** 최근 갱신 시각(ISO) */
  updatedAt: string;
}

/** 누적 운동 통계 (FR-014) */
export interface Statistics {
  totalWorkouts: number;
  totalDurationSec: number;
  totalSets: number;
  totalReps: number;
  totalVolume: number;
  /** 연속 운동일 (Streak) */
  streakDays: number;
  /** 이번 주 운동 횟수 */
  weeklyWorkouts: number;
  /** 마지막 계산 시각(ISO) */
  calculatedAt: string;
}
