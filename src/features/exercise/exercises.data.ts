/**
 * Exercise Master Catalog — 사용자 카탈로그 기반.
 *
 * 원본은 `data/운동정보.tsv`(사용자가 작성한 표: 운동명·부위·세트·횟수·휴식·단계1~3·주의사항)이며,
 * `scripts/build_catalog.py` 가 이를 `exerciseCatalog.json` 으로 변환한다. 이 파일은 그 JSON 을
 * 04_EXERCISE_DATABASE §19 스키마의 Exercise 로 매핑한다.
 *
 * 표에 없는 스키마 항목(관절부담·템포·ROM·그립·호흡)은 화면에 노출되지 않는 내부 메타데이터라
 * 카테고리 기준 보수적 기본값으로 채운다. 화면에 보이는 문구(단계·주의사항)는 전부 표의 값이다.
 *
 * Public 데이터(07 SEC-001): 앱과 함께 배포하며 LocalStorage 에 저장하지 않는다.
 */
import type {
  Exercise,
  ExerciseCategory,
  Joint,
  JointLoad,
  MachineType,
} from '@models/exercise';
import catalog from './exerciseCatalog.json';

/** exerciseCatalog.json 한 줄의 형태 */
export interface CatalogEntry {
  id: string;
  displayName: string;
  englishName: string;
  category: string;
  machineType: string;
  primaryMuscle: string;
  secondaryMuscles: string[];
  difficulty: string;
  safety: string;
  sets: number;
  reps: number;
  restSec: number;
  steps: string[];
  caution: string;
  /** 사진이 실제로 존재하는 단계 번호 (예: [1,2,3]) */
  photoSteps: number[];
}

export const CATALOG = catalog as CatalogEntry[];

const BREATH_DEFAULT = '힘을 쓸 때 숨을 내쉬고, 천천히 돌아오며 숨을 들이쉰다.';

/** 카테고리별 주요 관절 부담 기본값 (04 §11) */
const JOINT_LOAD_BY_CATEGORY: Record<string, Partial<Record<Joint, JointLoad>>> = {
  'CAT-CHEST': { wrist: 'JL-1', elbow: 'JL-1', shoulder: 'JL-2' },
  'CAT-BACK': { elbow: 'JL-1', shoulder: 'JL-2', lowerBack: 'JL-1' },
  'CAT-SHOULDER': { elbow: 'JL-1', shoulder: 'JL-2' },
  'CAT-ARM': { wrist: 'JL-2', elbow: 'JL-2' },
  'CAT-LEG': { hip: 'JL-1', knee: 'JL-2', ankle: 'JL-1' },
  'CAT-CORE': { lowerBack: 'JL-1', shoulder: 'JL-1' },
};

/** 맨몸 운동은 기구 부하가 없어 관절 부담을 한 단계 낮춰 본다. */
const BODYWEIGHT_RELIEF: Record<JointLoad, JointLoad> = {
  'JL-0': 'JL-0',
  'JL-1': 'JL-0',
  'JL-2': 'JL-1',
  'JL-3': 'JL-2',
};

function jointLoadFor(entry: CatalogEntry): Partial<Record<Joint, JointLoad>> {
  const base = JOINT_LOAD_BY_CATEGORY[entry.category] ?? {};
  if (entry.machineType !== 'MCH-BODYWEIGHT') return { ...base };
  const relieved: Partial<Record<Joint, JointLoad>> = {};
  for (const [joint, load] of Object.entries(base) as [Joint, JointLoad][]) {
    relieved[joint] = BODYWEIGHT_RELIEF[load];
  }
  return relieved;
}

function toExercise(entry: CatalogEntry): Exercise {
  return {
    id: entry.id,
    displayName: entry.displayName,
    englishName: entry.englishName,
    category: entry.category as ExerciseCategory,
    machineType: entry.machineType as MachineType,
    primaryMuscle: entry.primaryMuscle as Exercise['primaryMuscle'],
    secondaryMuscles: entry.secondaryMuscles as Exercise['secondaryMuscles'],
    difficulty: entry.difficulty as Exercise['difficulty'],
    safety: entry.safety as Exercise['safety'],
    jointLoad: jointLoadFor(entry),
    recommendedSets: entry.sets,
    // 표는 목표 횟수 하나만 주므로 범위의 최소·최대를 같은 값으로 둔다(표시는 "12회").
    recommendedReps: { min: entry.reps, max: entry.reps },
    recommendedRestSec: entry.restSec,
    tempo: '2-1-2-0',
    rom: 'CONTROLLED',
    grip: 'NEUTRAL',
    breathingGuide: BREATH_DEFAULT,
    // 운동 진행 화면의 "💡 TIP" 으로 노출된다.
    formCues: entry.caution ? [entry.caution] : [],
    commonMistakes: entry.caution ? [entry.caution] : [],
    contraindications: [],
    searchKeywords: [entry.displayName, entry.englishName, entry.id],
    imageId: entry.id,
  };
}

export const EXERCISES: Exercise[] = CATALOG.map(toExercise);

export const EXERCISE_BY_ID: Record<string, Exercise> = Object.fromEntries(
  EXERCISES.map((ex) => [ex.id, ex]),
);
