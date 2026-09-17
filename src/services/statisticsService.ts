/**
 * Statistics Service — FR-013(PR) / FR-014(통계).
 * 통계·PR 은 저장된 완료 기록(History)에서 계산하는 파생 데이터다(항상 기록과 일치).
 * 계산 결과는 statistics 키에 캐시하되, 진실의 출처는 History 다.
 */
import { STORAGE_KEYS } from '@constants/storage';
import { storageAdapter } from '@storage/storageAdapter';
import { workoutRepository } from '@repositories/workoutRepository';
import type { PersonalRecord, Statistics } from '@models/statistics';
import type { SetRecord, WorkoutRecord } from '@models/workout';
import { dateKey, nowISO } from '@utils/datetime';

interface Best {
  maxWeight: number;
  maxReps: number;
  maxVolume: number;
}

function bestOfSets(sets: SetRecord[]): Best {
  return sets
    .filter((s) => s.completed)
    .reduce<Best>(
      (acc, s) => ({
        maxWeight: Math.max(acc.maxWeight, s.weight),
        maxReps: Math.max(acc.maxReps, s.reps),
        maxVolume: Math.max(acc.maxVolume, s.volume),
      }),
      { maxWeight: 0, maxReps: 0, maxVolume: 0 },
    );
}

/** 주어진 기록 집합으로부터 운동별 PR 계산 (BR-006: 동일 운동 내 비교) */
function computePRs(history: WorkoutRecord[]): Map<string, PersonalRecord> {
  const prs = new Map<string, PersonalRecord>();
  for (const rec of history) {
    for (const ex of rec.exercises) {
      const best = bestOfSets(ex.sets);
      const prev = prs.get(ex.exerciseId);
      prs.set(ex.exerciseId, {
        exerciseId: ex.exerciseId,
        maxWeight: Math.max(prev?.maxWeight ?? 0, best.maxWeight),
        maxReps: Math.max(prev?.maxReps ?? 0, best.maxReps),
        maxVolume: Math.max(prev?.maxVolume ?? 0, best.maxVolume),
        updatedAt: rec.performedAt,
      });
    }
  }
  return prs;
}

/** 연속 운동일(Streak): 가장 최근 운동일부터 하루 간격으로 이어진 일수 */
function computeStreak(history: WorkoutRecord[]): number {
  if (history.length === 0) return 0;
  const days = Array.from(new Set(history.map((r) => dateKey(r.performedAt))))
    .sort()
    .reverse();
  let streak = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1]);
    const cur = new Date(days[i]);
    const diffDays = Math.round((prev.getTime() - cur.getTime()) / 86_400_000);
    if (diffDays === 1) streak++;
    else break;
  }
  return streak;
}

function computeStatistics(history: WorkoutRecord[]): Statistics {
  const totals = history.reduce(
    (acc, r) => ({
      totalDurationSec: acc.totalDurationSec + r.durationSec,
      totalSets: acc.totalSets + r.summary.totalSets,
      totalReps: acc.totalReps + r.summary.totalReps,
      totalVolume: acc.totalVolume + r.summary.totalVolume,
    }),
    { totalDurationSec: 0, totalSets: 0, totalReps: 0, totalVolume: 0 },
  );

  const weekAgo = Date.now() - 7 * 86_400_000;
  const weeklyWorkouts = history.filter(
    (r) => new Date(r.performedAt).getTime() >= weekAgo,
  ).length;

  return {
    totalWorkouts: history.length,
    ...totals,
    streakDays: computeStreak(history),
    weeklyWorkouts,
    calculatedAt: nowISO(),
  };
}

export const statisticsService = {
  /** History 기준 운동별 PR (현재 저장된 기록 기반) */
  getPersonalRecords(): Map<string, PersonalRecord> {
    return computePRs(workoutRepository.getHistory());
  },

  getPersonalRecordOf(exerciseId: string): PersonalRecord | undefined {
    return this.getPersonalRecords().get(exerciseId);
  },

  /** 통계 재계산 후 캐시에 저장하고 반환 (운동 종료 시 호출) */
  recompute(): Statistics {
    const stats = computeStatistics(workoutRepository.getHistory());
    storageAdapter.write(STORAGE_KEYS.statistics, stats);
    return stats;
  },

  /** 캐시된 통계 조회(없으면 재계산) */
  getStatistics(): Statistics {
    return (
      storageAdapter.read<Statistics>(STORAGE_KEYS.statistics)?.data ??
      this.recompute()
    );
  },
};
