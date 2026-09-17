/**
 * Exercise 도메인 모델 — 04_EXERCISE_DATABASE 스키마 준수(§4, §16, §19).
 *
 * 코드 체계(카테고리/근육/난이도/안전/관절부담/ROM/그립)는 문서의 코드를 그대로 사용한다.
 * 문서가 값을 명시하지 않은 항목은 보수적 기본값으로 채우며 docs/EXERCISE_DATA_DERIVED.md 에 기록.
 */
import type { RepRange } from './common';

export type { RepRange };

/** 운동 카테고리 (04 §7) */
export type ExerciseCategory =
  | 'CAT-CHEST'
  | 'CAT-BACK'
  | 'CAT-SHOULDER'
  | 'CAT-ARM'
  | 'CAT-LEG'
  | 'CAT-CORE'
  | 'CAT-FULL'
  | 'CAT-MOBILITY';

/**
 * 머신 분류 (04 §9 MCH-001~004).
 * MCH-BODYWEIGHT 는 사용자 카탈로그(data/운동정보.tsv)의 맨몸 운동을 수용하기 위한 확장.
 */
export type MachineType =
  | 'MCH-PLATE'
  | 'MCH-SELECTORIZED'
  | 'MCH-CABLE'
  | 'MCH-SMITH'
  | 'MCH-BODYWEIGHT';

/** 난이도 (04 §8) */
export type Difficulty = 'LV-1' | 'LV-2' | 'LV-3' | 'LV-4' | 'LV-5';

/** 안전 등급 (04 §10) */
export type SafetyLevel = 'SAFE-A' | 'SAFE-B' | 'SAFE-C' | 'SAFE-D';

/**
 * 근육군 (04 §5 Primary Groups 10종).
 * MUS-ADDUCTORS 는 문서 예시(Hip Adductor "Adductor Group")를 수용하기 위한 확장(EXDB-004).
 */
export type MuscleGroup =
  | 'MUS-CHEST'
  | 'MUS-BACK'
  | 'MUS-SHOULDER'
  | 'MUS-BICEPS'
  | 'MUS-TRICEPS'
  | 'MUS-CORE'
  | 'MUS-GLUTES'
  | 'MUS-QUADRICEPS'
  | 'MUS-HAMSTRINGS'
  | 'MUS-CALVES'
  | 'MUS-ADDUCTORS';

/** 관절 부담 등급 (04 §11) */
export type JointLoad = 'JL-0' | 'JL-1' | 'JL-2' | 'JL-3';

/** 대상 관절 (04 §11) */
export type Joint =
  | 'wrist'
  | 'elbow'
  | 'shoulder'
  | 'lowerBack'
  | 'hip'
  | 'knee'
  | 'ankle';

/** 가동 범위 (04 §12) */
export type ROMType = 'FULL' | 'PARTIAL' | 'CONTROLLED' | 'LIMITED';

/** 그립 (04 §13) */
export type GripType = 'PRONATED' | 'SUPINATED' | 'NEUTRAL' | 'MIXED';
export type GripWidth = 'NARROW' | 'NORMAL' | 'WIDE';

/**
 * 운동 마스터 레코드 (04 §19 Standard Exercise Record).
 * Public 데이터로 앱과 함께 배포된다(07 SEC-001) → LocalStorage 에 저장하지 않는다.
 */
export interface Exercise {
  id: string;
  displayName: string;
  englishName: string;
  category: ExerciseCategory;
  machineType: MachineType;
  primaryMuscle: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  difficulty: Difficulty;
  safety: SafetyLevel;
  /** 주요 관절별 부담도 */
  jointLoad: Partial<Record<Joint, JointLoad>>;
  recommendedSets: number;
  recommendedReps: RepRange;
  recommendedRestSec: number;
  /** 템포 (예: '2-1-2-0', 04 §14) */
  tempo: string;
  rom: ROMType;
  grip: GripType;
  gripWidth?: GripWidth;
  /** 호흡 가이드 (04 §15) */
  breathingGuide: string;
  /** 핵심 자세 지침 (04 §23 Form Cues) */
  formCues: string[];
  /** 자주 하는 실수 (04 §23) */
  commonMistakes: string[];
  /** 금기/주의 (04 §23 Contraindications) */
  contraindications: string[];
  /** 검색 키워드 (한/영, 04 §21) */
  searchKeywords: string[];
  /** 대체 운동 ID */
  alternativeExerciseId?: string;
  /** 일러스트 매핑 ID (05 §16). Phase 2 에서는 플레이스홀더로 연결. */
  imageId: string;
}
