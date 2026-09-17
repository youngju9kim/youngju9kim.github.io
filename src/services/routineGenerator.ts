/**
 * Routine Generator — FR-003 루틴 생성.
 *
 * 규칙:
 *  - BR-001/§20: 머신 운동만, SAFE-A/B, LV-1~2, 손목/무릎 부담 낮은 운동 우선.
 *  - BR-002: 목표 시간 30분(±5분).
 *  - BR-003: 대근육 → 소근육 → 보조 순서. 동일 부위 연속 과다 배치 금지.
 *  - AC(FR-003): 모두 머신, 동일 운동 중복 없음, 목표 시간 만족.
 *
 * 목적/시간/빈도는 문서에 값이 열거되지 않아 보수적으로 정의했다(EXERCISE_DATA_DERIVED 정신).
 */
import type { Exercise, ExerciseCategory } from '@models/exercise';
import type { Routine, RoutineExercise } from '@models/routine';
import { exerciseRepository } from '@repositories/exerciseRepository';
import { createId } from '@utils/id';
import { nowISO } from '@utils/datetime';

/** 운동 목적(파생 정의) */
export type WorkoutGoal = 'full-body' | 'upper' | 'lower';

export interface GenerateOptions {
  goal: WorkoutGoal;
  /** 목표 운동 시간(분). 기본 30 (BR-002) */
  targetMinutes?: number;
  /** 주간 운동 빈도(루틴 이름/설명에 반영, 향후 분할에 사용) */
  frequencyPerWeek?: number;
}

export const GOAL_LABELS: Record<WorkoutGoal, string> = {
  'full-body': '전신 근력',
  upper: '상체 중심',
  lower: '하체 중심',
};

/** 대근육 → 소근육 → 보조 순서 (BR-003) */
const CATEGORY_PRIORITY: Record<WorkoutGoal, ExerciseCategory[]> = {
  'full-body': ['CAT-CHEST', 'CAT-BACK', 'CAT-LEG', 'CAT-SHOULDER', 'CAT-ARM', 'CAT-CORE'],
  upper: ['CAT-CHEST', 'CAT-BACK', 'CAT-SHOULDER', 'CAT-ARM', 'CAT-CORE'],
  lower: ['CAT-LEG', 'CAT-LEG', 'CAT-CORE'],
};

/** 운동 1개 예상 소요 시간(분): 세트 × (반복시간 + 휴식) + 셋업. */
function estimateExerciseMinutes(ex: Exercise): number {
  const avgReps = (ex.recommendedReps.min + ex.recommendedReps.max) / 2;
  const workPerSet = avgReps * 3; // 초/회 (템포 기준 보수적)
  const perSet = workPerSet + ex.recommendedRestSec;
  const setupSec = 30;
  return (ex.recommendedSets * perSet + setupSec) / 60;
}

/** 안전·난이도 정책을 통과한 후보 (§20) */
function candidatePool(): Exercise[] {
  return exerciseRepository
    .filter({ maxDifficulty: 'LV-2', safety: ['SAFE-A', 'SAFE-B'] })
    .slice();
}

export const routineGenerator = {
  generate({
    goal,
    targetMinutes = 30,
    frequencyPerWeek,
  }: GenerateOptions): Routine {
    const pool = candidatePool();
    const byCategory = new Map<ExerciseCategory, Exercise[]>();
    for (const ex of pool) {
      const list = byCategory.get(ex.category) ?? [];
      // SAFE-A 우선, 그다음 낮은 난이도 우선
      list.push(ex);
      byCategory.set(ex.category, list);
    }
    for (const list of byCategory.values()) {
      list.sort((a, b) => {
        if (a.safety !== b.safety) return a.safety < b.safety ? -1 : 1; // SAFE-A < SAFE-B
        return a.difficulty.localeCompare(b.difficulty);
      });
    }

    const order = CATEGORY_PRIORITY[goal];
    const usedIds = new Set<string>();
    const selected: Exercise[] = [];
    let estMin = 0;
    const minTarget = targetMinutes - 5;
    const maxTarget = targetMinutes + 5;

    // 카테고리 우선순위를 라운드로 돌며 한 개씩 추가(동일 부위 연속 방지)
    let progressed = true;
    while (progressed && estMin < maxTarget) {
      progressed = false;
      for (const cat of order) {
        if (estMin >= maxTarget) break;
        const pick = (byCategory.get(cat) ?? []).find(
          (ex) =>
            !usedIds.has(ex.id) &&
            selected[selected.length - 1]?.primaryMuscle !== ex.primaryMuscle,
        );
        if (!pick) continue;
        const t = estimateExerciseMinutes(pick);
        if (estMin + t > maxTarget && selected.length > 0) continue;
        selected.push(pick);
        usedIds.add(pick.id);
        estMin += t;
        progressed = true;
        if (estMin >= minTarget && estMin <= maxTarget) {
          // 목표 범위 진입 후에는 한 라운드 더 채우되 초과 방지
        }
      }
      if (estMin >= minTarget) break;
    }

    const exercises: RoutineExercise[] = selected.map((ex, i) => ({
      exerciseId: ex.id,
      order: i,
      sets: ex.recommendedSets,
      targetReps: ex.recommendedReps,
      restSec: ex.recommendedRestSec,
    }));

    const now = nowISO();
    const freqSuffix = frequencyPerWeek ? ` (주 ${frequencyPerWeek}회)` : '';
    return {
      id: createId('routine'),
      name: `${GOAL_LABELS[goal]} 루틴${freqSuffix}`,
      description: `${GOAL_LABELS[goal]} · 약 ${Math.round(estMin)}분 · 머신 중심`,
      estimatedDurationMin: Math.round(estMin),
      exercises,
      source: 'generated',
      createdAt: now,
      updatedAt: now,
    };
  },

  /** 예상 소요 시간(분) 재계산 — 루틴 편집 시 사용(FR-004) */
  estimateRoutineMinutes(exercises: RoutineExercise[]): number {
    let total = 0;
    for (const re of exercises) {
      const ex = exerciseRepository.getById(re.exerciseId);
      if (!ex) continue;
      const avgReps = (re.targetReps.min + re.targetReps.max) / 2;
      const perSet = avgReps * 3 + re.restSec;
      total += (re.sets * perSet + 30) / 60;
    }
    return Math.round(total);
  },
};
