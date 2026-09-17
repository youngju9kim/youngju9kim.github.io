/**
 * Exercise Repository — 07_ARCHITECTURE §9, 04_EXERCISE_DATABASE §21/22.
 *
 * 운동 마스터 데이터 조회·검색. Public 데이터라 LocalStorage 가 아닌 번들 데이터셋을 제공한다.
 * 상위 계층은 이 인터페이스만 사용하며, 향후 데이터 출처가 바뀌어도 영향받지 않는다.
 */
import type {
  Exercise,
  ExerciseCategory,
  Difficulty,
  SafetyLevel,
} from '@models/exercise';
import { EXERCISES, EXERCISE_BY_ID } from '@features/exercise/exercises.data';

/** 검색/필터 정규화: 대소문자·공백·하이픈 무시 (04 §21) */
function normalize(text: string): string {
  return text.toLowerCase().replace(/[\s-]/g, '');
}

export interface ExerciseFilter {
  category?: ExerciseCategory;
  maxDifficulty?: Difficulty;
  safety?: SafetyLevel[];
}

const DIFFICULTY_ORDER: Difficulty[] = ['LV-1', 'LV-2', 'LV-3', 'LV-4', 'LV-5'];

export const exerciseRepository = {
  getAll(): Exercise[] {
    return EXERCISES;
  },

  getById(id: string): Exercise | undefined {
    return EXERCISE_BY_ID[id];
  },

  getManyByIds(ids: string[]): Exercise[] {
    return ids.map((id) => EXERCISE_BY_ID[id]).filter((e): e is Exercise => !!e);
  },

  /** 한/영/키워드 부분 일치 검색 (04 §21) */
  search(query: string): Exercise[] {
    const q = normalize(query.trim());
    if (!q) return EXERCISES;
    return EXERCISES.filter((ex) => {
      const haystack = [
        ex.displayName,
        ex.englishName,
        ...ex.searchKeywords,
      ].map(normalize);
      return haystack.some((h) => h.includes(q));
    });
  },

  /** 조건 필터 (04 §22) */
  filter({ category, maxDifficulty, safety }: ExerciseFilter): Exercise[] {
    const maxIdx = maxDifficulty
      ? DIFFICULTY_ORDER.indexOf(maxDifficulty)
      : DIFFICULTY_ORDER.length - 1;
    return EXERCISES.filter((ex) => {
      if (category && ex.category !== category) return false;
      if (DIFFICULTY_ORDER.indexOf(ex.difficulty) > maxIdx) return false;
      if (safety && !safety.includes(ex.safety)) return false;
      return true;
    });
  },
};
