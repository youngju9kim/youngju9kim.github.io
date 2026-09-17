/** 도메인 코드 → 한글 표시 라벨 (04_EXERCISE_DATABASE 코드 기반). */
import type {
  MuscleGroup,
  ExerciseCategory,
  MachineType,
  SafetyLevel,
  Difficulty,
} from '@models/exercise';

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  'MUS-CHEST': '가슴',
  'MUS-BACK': '등',
  'MUS-SHOULDER': '어깨',
  'MUS-BICEPS': '이두',
  'MUS-TRICEPS': '삼두',
  'MUS-CORE': '코어',
  'MUS-GLUTES': '둔근',
  'MUS-QUADRICEPS': '대퇴사두근',
  'MUS-HAMSTRINGS': '햄스트링',
  'MUS-CALVES': '종아리',
  'MUS-ADDUCTORS': '내전근',
};

export const CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  'CAT-CHEST': '가슴',
  'CAT-BACK': '등',
  'CAT-SHOULDER': '어깨',
  'CAT-ARM': '팔',
  'CAT-LEG': '하체',
  'CAT-CORE': '코어',
  'CAT-FULL': '전신',
  'CAT-MOBILITY': '가동성',
};

export const MACHINE_LABELS: Record<MachineType, string> = {
  'MCH-PLATE': '플레이트 머신',
  'MCH-SELECTORIZED': '핀 머신',
  'MCH-CABLE': '케이블 머신',
  'MCH-SMITH': '스미스 머신',
  'MCH-BODYWEIGHT': '맨몸 운동',
};

export const SAFETY_LABELS: Record<SafetyLevel, string> = {
  'SAFE-A': '매우 안전',
  'SAFE-B': '안전',
  'SAFE-C': '주의',
  'SAFE-D': '고위험',
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  'LV-1': '초급',
  'LV-2': '초급~중급',
  'LV-3': '중급',
  'LV-4': '중급~고급',
  'LV-5': '고급',
};
