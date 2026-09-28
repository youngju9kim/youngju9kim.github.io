/**
 * Routine Generator — FR-003 루틴 생성.
 *
 * 규칙:
 *  - BR-001/§20: SAFE-A/B, LV-1~2, 손목/무릎 부담 낮은 운동 우선.
 *  - BR-002: 목표 시간 30분(±5분).
 *  - BR-003: 대근육 → 소근육 → 보조 순서. 동일 부위 연속 과다 배치 금지.
 *  - AC(FR-003): 동일 운동 중복 없음, 목표 시간 만족.
 *
 * 장소(equipment):
 *  - gym  : 머신·케이블 포함 전부
 *  - home : 기구 없이 하는 맨몸 운동만 (MCH-BODYWEIGHT)
 *
 * 같은 조건으로 '다시 뽑기' 를 하면 다른 구성이 나와야 하므로,
 * 안전·난이도 우선순위는 유지하되 상위 후보 중에서 무작위로 고른다.
 */
import type { Exercise, ExerciseCategory } from '@models/exercise';
import type {
  Routine,
  RoutineExercise,
  RoutineRecipe,
  WorkoutGoal,
  Equipment,
} from '@models/routine';
import { exerciseRepository } from '@repositories/exerciseRepository';
import { createId } from '@utils/id';
import { nowISO } from '@utils/datetime';

export type { WorkoutGoal, Equipment, RoutineRecipe };

export interface GenerateOptions extends RoutineRecipe {
  /**
   * 되도록 피할 운동 id — '다시 뽑기' 에서 직전 구성을 넘겨주면
   * 눈에 띄게 다른 루틴이 나온다. 후보가 부족하면 무시된다.
   */
  avoidExerciseIds?: string[];
}

export const GOAL_LABELS: Record<WorkoutGoal, string> = {
  'full-body': '전신 근력',
  upper: '상체 중심',
  lower: '하체 중심',
  core: '코어 중심',
};

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  gym: '헬스장',
  home: '집 (맨몸)',
};

/** 대근육 → 소근육 → 보조 순서 (BR-003) */
const CATEGORY_PRIORITY: Record<WorkoutGoal, ExerciseCategory[]> = {
  'full-body': ['CAT-CHEST', 'CAT-BACK', 'CAT-LEG', 'CAT-SHOULDER', 'CAT-ARM', 'CAT-CORE'],
  upper: ['CAT-CHEST', 'CAT-BACK', 'CAT-SHOULDER', 'CAT-ARM', 'CAT-CORE'],
  lower: ['CAT-LEG', 'CAT-CORE'],
  core: ['CAT-CORE', 'CAT-LEG'],
};

/** 루틴 하나로 성립하려면 이 정도 부위는 채워져야 한다. */
const MIN_CATEGORIES_PER_GOAL = 2;

/**
 * 장소별로 고를 수 있는 목적 — 실제 운동 데이터에서 계산한다.
 *
 * 하드코딩하지 않는 이유: 맨몸 운동을 늘리거나 줄이면 가능한 목적도 달라진다.
 * (2026-09-17 에는 맨몸 등·어깨 운동이 없어 집에서 '상체 중심' 이 불가능했고,
 *  09-28 에 운동을 추가하자 가능해졌다)
 */
export function availableGoals(equipment: Equipment): WorkoutGoal[] {
  const pool = candidatePool(equipment);
  const filled = new Set(pool.map((ex) => ex.category));
  return (Object.keys(CATEGORY_PRIORITY) as WorkoutGoal[]).filter((goal) => {
    const covered = CATEGORY_PRIORITY[goal].filter((c) => filled.has(c));
    return covered.length >= MIN_CATEGORIES_PER_GOAL;
  });
}

/**
 * 세트 1회의 운동 시간(초).
 * 버티는 운동은 목표 시간이 곧 운동 시간이고, 반복 운동은 1회당 3초(템포 기준 보수적)로 본다.
 */
function workSecondsPerSet(target: number, unit: Exercise['repUnit']): number {
  return unit === 'seconds' ? target : target * 3;
}

/** 운동 1개 예상 소요 시간(분): 세트 × (운동시간 + 휴식) + 셋업. */
function estimateExerciseMinutes(ex: Exercise): number {
  const avg = (ex.recommendedReps.min + ex.recommendedReps.max) / 2;
  const perSet = workSecondsPerSet(avg, ex.repUnit) + ex.recommendedRestSec;
  const setupSec = 30;
  return (ex.recommendedSets * perSet + setupSec) / 60;
}

/** 안전·난이도 정책을 통과한 후보 (§20) */
function candidatePool(equipment: Equipment): Exercise[] {
  const pool = exerciseRepository.filter({
    maxDifficulty: 'LV-2',
    safety: ['SAFE-A', 'SAFE-B'],
  });
  if (equipment === 'home') {
    return pool.filter((ex) => ex.machineType === 'MCH-BODYWEIGHT');
  }
  return pool.slice();
}

/** 상위 후보 중 무작위 — 안전한 쪽을 유지하면서 매번 다른 구성이 나오게 한다. */
function pickVaried(candidates: Exercise[], avoid: Set<string>): Exercise | undefined {
  if (candidates.length === 0) return undefined;
  // 직전 루틴에 없던 것을 우선 고른다. 전부 겹치면 그냥 전체에서 고른다.
  const fresh = candidates.filter((ex) => !avoid.has(ex.id));
  const from = fresh.length > 0 ? fresh : candidates;
  const top = from.slice(0, 3); // 정렬돼 있으므로 앞쪽이 더 안전·쉬움
  return top[Math.floor(Math.random() * top.length)];
}

export const routineGenerator = {
  generate({
    goal,
    equipment,
    targetMinutes = 30,
    frequencyPerWeek,
    avoidExerciseIds = [],
  }: GenerateOptions): Routine {
    const pool = candidatePool(equipment);
    const avoid = new Set(avoidExerciseIds);

    const byCategory = new Map<ExerciseCategory, Exercise[]>();
    for (const ex of pool) {
      const list = byCategory.get(ex.category) ?? [];
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
        const eligible = (byCategory.get(cat) ?? []).filter(
          (ex) =>
            !usedIds.has(ex.id) &&
            selected[selected.length - 1]?.primaryMuscle !== ex.primaryMuscle,
        );
        const pick = pickVaried(eligible, avoid);
        if (!pick) continue;
        const t = estimateExerciseMinutes(pick);
        if (estMin + t > maxTarget && selected.length > 0) continue;
        selected.push(pick);
        usedIds.add(pick.id);
        estMin += t;
        progressed = true;
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
    const placePrefix = equipment === 'home' ? '집 ' : '';
    return {
      id: createId('routine'),
      name: `${placePrefix}${GOAL_LABELS[goal]} 루틴${freqSuffix}`,
      description: `${EQUIPMENT_LABELS[equipment]} · ${GOAL_LABELS[goal]} · 약 ${Math.round(estMin)}분`,
      estimatedDurationMin: Math.round(estMin),
      exercises,
      source: 'generated',
      recipe: { goal, equipment, targetMinutes, frequencyPerWeek },
      createdAt: now,
      updatedAt: now,
    };
  },

  /**
   * 같은 부위의 다른 운동 후보 — 편집 화면의 '교체' 에 쓴다.
   * 이미 루틴에 들어 있는 운동은 제외한다.
   */
  alternativesFor(exerciseId: string, excludeIds: string[] = []): Exercise[] {
    const target = exerciseRepository.getById(exerciseId);
    if (!target) return [];
    const exclude = new Set([...excludeIds, exerciseId]);
    return exerciseRepository
      .filter({ category: target.category })
      .filter((ex) => !exclude.has(ex.id));
  },

  /** 예상 소요 시간(분) 재계산 — 루틴 편집 시 사용(FR-004) */
  estimateRoutineMinutes(exercises: RoutineExercise[]): number {
    let total = 0;
    for (const re of exercises) {
      const ex = exerciseRepository.getById(re.exerciseId);
      if (!ex) continue;
      const avg = (re.targetReps.min + re.targetReps.max) / 2;
      const perSet = workSecondsPerSet(avg, ex.repUnit) + re.restSec;
      total += (re.sets * perSet + 30) / 60;
    }
    return Math.round(total);
  },
};
