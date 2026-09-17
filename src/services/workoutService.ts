/**
 * Workout Service — FR-005~010 운동 시작/진행/종료.
 *
 * - 세트 완료 시 즉시 저장(BR-007). 함수는 불변 업데이트 후 활성 세션을 persist.
 * - 세트는 명시적 완료만 인정(BR-004). 이미 완료된 세트 재완료는 무시(EC-004).
 * - 세션 완료(BR-005): 모든 필수 세트 완료 + 기록 저장 성공.
 * - PR(FR-013): 이번 세션 최고치를 "기존 History 기반 PR"과 비교해 판정(BR-006).
 */
import type { Routine } from '@models/routine';
import type {
  WorkoutSession,
  SessionExercise,
  SetRecord,
  WorkoutRecord,
  WorkoutSummary,
  PersonalRecordHit,
} from '@models/workout';
import { workoutRepository } from '@repositories/workoutRepository';
import { statisticsService } from '@services/statisticsService';
import { createId } from '@utils/id';
import { nowISO, elapsedSec } from '@utils/datetime';

/** 특정 운동의 이전 수행에서 마지막 완료 세트(FR-006/012 기본값 제안) */
function previousSet(exerciseId: string): SetRecord | undefined {
  const rec = workoutRepository.getLastPerformanceOf(exerciseId);
  const ex = rec?.exercises.find((e) => e.exerciseId === exerciseId);
  const done = ex?.sets.filter((s) => s.completed) ?? [];
  return done[done.length - 1];
}

function buildSessionExercises(routine: Routine): SessionExercise[] {
  return routine.exercises
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((re) => {
      const prev = previousSet(re.exerciseId);
      const defaultWeight = prev?.weight ?? 0;
      const defaultReps = prev?.reps ?? re.targetReps.min;
      const sets: SetRecord[] = Array.from({ length: re.sets }, (_, i) => ({
        setNumber: i + 1,
        weight: defaultWeight,
        reps: defaultReps,
        volume: 0,
        completed: false,
      }));
      return {
        exerciseId: re.exerciseId,
        order: re.order,
        targetSets: re.sets,
        targetReps: re.targetReps,
        restSec: re.restSec,
        sets,
      };
    });
}

export const workoutService = {
  /** 운동 세션 생성 + 활성 세션으로 저장 (FR-005) */
  startSession(routine: Routine): WorkoutSession {
    const now = nowISO();
    const session: WorkoutSession = {
      id: createId('session'),
      routineId: routine.id,
      routineName: routine.name,
      status: 'in-progress',
      startedAt: now,
      currentExerciseIndex: 0,
      exercises: buildSessionExercises(routine),
      createdAt: now,
      updatedAt: now,
    };
    workoutRepository.saveActiveSession(session);
    return session;
  },

  /** 세트 완료 기록 + 즉시 저장 (FR-007, BR-004/007, EC-004). 불변 업데이트. */
  completeSet(
    session: WorkoutSession,
    exerciseIndex: number,
    setNumber: number,
    weight: number,
    reps: number,
  ): WorkoutSession {
    const exercises = session.exercises.map((ex, i) => {
      if (i !== exerciseIndex) return ex;
      return {
        ...ex,
        sets: ex.sets.map((s) => {
          if (s.setNumber !== setNumber) return s;
          if (s.completed) return s; // EC-004: 중복 완료 방지
          return {
            ...s,
            weight,
            reps,
            volume: weight * reps,
            completed: true,
            completedAt: nowISO(),
          };
        }),
      };
    });
    const updated: WorkoutSession = {
      ...session,
      exercises,
      updatedAt: nowISO(),
    };
    workoutRepository.saveActiveSession(updated);
    return updated;
  },

  /** 현재 운동 인덱스 갱신 + 저장 (FR-009, 복구 대비 EC-001) */
  setCurrentExercise(session: WorkoutSession, index: number): WorkoutSession {
    const updated = { ...session, currentExerciseIndex: index, updatedAt: nowISO() };
    workoutRepository.saveActiveSession(updated);
    return updated;
  },

  isExerciseComplete(ex: SessionExercise): boolean {
    return ex.sets.every((s) => s.completed);
  },

  isSessionComplete(session: WorkoutSession): boolean {
    return session.exercises.every((ex) => this.isExerciseComplete(ex));
  },

  /** 진행률(FR-009): 완료 세트 / 전체 세트 */
  getProgress(session: WorkoutSession): {
    completedSets: number;
    totalSets: number;
    percent: number;
  } {
    let completed = 0;
    let total = 0;
    for (const ex of session.exercises) {
      total += ex.sets.length;
      completed += ex.sets.filter((s) => s.completed).length;
    }
    return {
      completedSets: completed,
      totalSets: total,
      percent: total === 0 ? 0 : (completed / total) * 100,
    };
  },

  /** 요약 계산 (FR-010) + PR 판정 (FR-013). 저장 전 상태 기준. */
  computeSummary(session: WorkoutSession): WorkoutSummary {
    const completedSets = session.exercises.flatMap((ex) =>
      ex.sets.filter((s) => s.completed),
    );
    const totalSets = completedSets.length;
    const totalReps = completedSets.reduce((a, s) => a + s.reps, 0);
    const totalVolume = completedSets.reduce((a, s) => a + s.volume, 0);
    const totalExercises = session.exercises.filter((ex) =>
      ex.sets.some((s) => s.completed),
    ).length;
    const totalDurationSec = elapsedSec(session.startedAt, nowISO());

    // 기존 History 기반 PR 과 비교(현재 세션은 아직 미저장)
    const prs = statisticsService.getPersonalRecords();
    const newRecords: PersonalRecordHit[] = [];
    for (const ex of session.exercises) {
      const done = ex.sets.filter((s) => s.completed);
      if (done.length === 0) continue;
      const maxWeight = Math.max(...done.map((s) => s.weight));
      const maxReps = Math.max(...done.map((s) => s.reps));
      const maxVolume = Math.max(...done.map((s) => s.volume));
      const pr = prs.get(ex.exerciseId);
      if (maxWeight > (pr?.maxWeight ?? 0))
        newRecords.push({ exerciseId: ex.exerciseId, type: 'weight', value: maxWeight });
      if (maxVolume > (pr?.maxVolume ?? 0))
        newRecords.push({ exerciseId: ex.exerciseId, type: 'volume', value: maxVolume });
      if (maxReps > (pr?.maxReps ?? 0))
        newRecords.push({ exerciseId: ex.exerciseId, type: 'reps', value: maxReps });
    }

    return {
      totalDurationSec,
      totalExercises,
      totalSets,
      totalReps,
      totalVolume,
      newRecords,
    };
  },

  /**
   * 세션 종료 처리 (FR-010, BR-005): 요약 계산 → History 저장 → 활성 세션 제거 → 통계 재계산.
   * 저장 성공 시에만 완료로 간주하고 record 를 반환한다.
   */
  finalize(session: WorkoutSession): { record: WorkoutRecord; summary: WorkoutSummary } | null {
    const summary = this.computeSummary(session);
    const now = nowISO();
    const record: WorkoutRecord = {
      id: createId('record'),
      routineId: session.routineId,
      routineName: session.routineName,
      performedAt: session.startedAt,
      durationSec: summary.totalDurationSec,
      // 완료된 세트만 보존
      exercises: session.exercises.map((ex) => ({
        ...ex,
        sets: ex.sets.filter((s) => s.completed),
      })),
      summary,
      createdAt: now,
      updatedAt: now,
    };

    const saved = workoutRepository.addRecord(record);
    if (!saved) return null; // 저장 실패 → 완료로 처리하지 않음(ERR-001, 재시도 유도)

    workoutRepository.clearActiveSession();
    statisticsService.recompute();
    return { record, summary };
  },

  /** 세션 폐기(운동 종료를 완료로 저장하지 않고 중단) */
  abandon(): void {
    workoutRepository.clearActiveSession();
  },
};
