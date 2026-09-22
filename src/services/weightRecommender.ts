/**
 * 시작 중량 추천 — 처음 하는 운동의 중량 기본값을 0 대신 개인화된 값으로 제안한다.
 *
 * 이전에 같은 운동을 한 적이 있으면 그때 중량이 항상 우선이고(workoutService),
 * 기록이 없을 때만 이 추천값을 쓴다. 사용자가 세트 화면에서 자유롭게 조정한다.
 *
 * 계산식:  추천중량 = 체중 × 운동계수 × 성별계수 × 나이계수 × 강도계수
 *
 * - 운동계수: 해당 머신에서 12회 반복 가능한 무게를 체중 대비 비율로 둔 값(성인 남성·보통 강도 기준).
 * - 보조 기구(어시스트 풀업/딥스)는 무게가 "도와주는 힘"이라 방향이 반대다 → 계수를 나눈다.
 * - 맨몸 운동은 중량 개념이 없어 0.
 *
 * ⚠️ 추천값은 출발점이며 안전을 보장하지 않는다. 보수적으로 잡되(기본 강도 '가볍게'),
 *    사용자가 반드시 직접 조정하도록 화면에서 안내한다.
 */
import type { Exercise } from '@models/exercise';
import { exerciseRepository } from '@repositories/exerciseRepository';
import { settingsRepository, type UserProfile } from '@repositories/settingsRepository';

/** 체중 대비 계수 (성인 남성 · 12회 반복 · 보통 강도) */
const BODYWEIGHT_RATIO: Record<string, number> = {
  // 하체
  'leg-press': 0.9,
  'hack-squat': 0.45,
  'smith-squat': 0.4,
  'leg-extension': 0.32,
  'seated-leg-curl': 0.28,
  'standing-calf-raise': 0.55,
  'hip-abduction': 0.3,
  'hip-adduction': 0.3,
  // 가슴
  'chest-press': 0.42,
  'hammer-chest-press': 0.42,
  'incline-chest-press': 0.36,
  'pec-deck': 0.28,
  'cable-crossover': 0.14,
  'cable-fly': 0.14,
  // 등
  'lat-pulldown': 0.48,
  'seated-row': 0.48,
  'machine-row': 0.48,
  'straight-arm-pulldown': 0.2,
  'cable-pullover': 0.2,
  // 어깨
  'machine-shoulder-press': 0.28,
  'rear-delt-fly': 0.16,
  'cable-face-pull': 0.2,
  'machine-lateral-raise': 0.14,
  'cable-lateral-raise': 0.07,
  // 팔
  'cable-pushdown': 0.24,
  'cable-biceps-curl': 0.22,
  'machine-biceps-curl': 0.18,
  'overhead-cable-extension': 0.16,
};

/**
 * 보조 기구: 설정하는 무게가 몸을 밀어 올려주는 "보조력"이라 힘이 약할수록 커야 한다.
 * 값은 초심자가 12회를 겨우 해내는 수준의 보조력(체중 대비).
 */
const ASSIST_RATIO: Record<string, number> = {
  'assisted-pullup': 0.45,
  'assisted-dips': 0.35,
};

/** 성별계수 — 상체는 차이가 더 크다. 미설정이면 중간값. */
function sexFactor(profile: UserProfile, exercise: Exercise): number {
  const lower = exercise.category === 'CAT-LEG';
  if (profile.sex === 'male') return 1;
  if (profile.sex === 'female') return lower ? 0.75 : 0.65;
  return lower ? 0.87 : 0.82; // 미설정: 남녀 중간
}

/** 나이계수 — 35세 이후 완만히 감소 */
function ageFactor(age: number): number {
  if (age < 35) return 1;
  if (age < 45) return 0.95;
  if (age < 55) return 0.88;
  if (age < 65) return 0.8;
  return 0.7;
}

export type Intensity = 'light' | 'normal' | 'strong';

const INTENSITY_FACTOR: Record<Intensity, number> = {
  light: 0.75,
  normal: 1,
  strong: 1.2,
};

export const INTENSITY_LABELS: Record<Intensity, string> = {
  light: '가볍게',
  normal: '보통',
  strong: '강하게',
};

export const INTENSITY_DESCRIPTIONS: Record<Intensity, string> = {
  light: '운동을 다시 시작하는 단계',
  normal: '꾸준히 운동해 온 편',
  strong: '근력 운동에 익숙함',
};

/** 머신 중량은 보통 2.5kg 단위로 조절된다. */
function roundToPlate(kg: number): number {
  return Math.round(kg / 2.5) * 2.5;
}

/** 이 운동이 중량을 입력하는 운동인지(맨몸 운동은 중량 개념이 없다) */
export function usesWeight(exercise: Exercise): boolean {
  return exercise.machineType !== 'MCH-BODYWEIGHT';
}

/** 설정하는 무게가 "보조력"인 기구인지(어시스트 풀업·딥스) */
export function isAssistMachine(exerciseId: string): boolean {
  return exerciseId in ASSIST_RATIO;
}

/**
 * 시작 중량 추천값(kg). 맨몸 운동이거나 계수가 없으면 0.
 * 단위 설정이 lb 여도 저장 값은 변환 없이 그대로 쓰는 앱 규칙을 따른다(표시 라벨만 다름).
 */
export function recommendWeight(
  exerciseId: string,
  profile: UserProfile = settingsRepository.getProfile(),
): number {
  const exercise = exerciseRepository.getById(exerciseId);
  if (!exercise || !usesWeight(exercise)) return 0;

  const strength =
    sexFactor(profile, exercise) *
    ageFactor(profile.age) *
    INTENSITY_FACTOR[profile.intensity];

  const assistRatio = ASSIST_RATIO[exerciseId];
  if (assistRatio !== undefined) {
    // 힘이 약할수록 보조가 더 필요하다 → 나눈다. 체중의 70% 를 넘지 않게 제한.
    const assist = Math.min((profile.bodyWeightKg * assistRatio) / strength, profile.bodyWeightKg * 0.7);
    return Math.max(roundToPlate(assist), 2.5);
  }

  const ratio = BODYWEIGHT_RATIO[exerciseId];
  if (ratio === undefined) return 0; // 사용자가 새로 추가한 운동 등

  const kg = profile.bodyWeightKg * ratio * strength;
  return Math.min(Math.max(roundToPlate(kg), 2.5), 300);
}
