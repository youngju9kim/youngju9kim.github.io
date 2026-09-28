/** 표시 포맷 유틸. 단위는 설정을 그대로 라벨로 사용(변환 없음). */
import { settingsRepository, type WeightUnit } from '@repositories/settingsRepository';
import type { RepUnit } from '@models/exercise';

export function currentUnit(): WeightUnit {
  return settingsRepository.getUnit();
}

/** 중량 표시: "45kg" */
export function formatWeight(value: number, unit: WeightUnit = currentUnit()): string {
  return `${value}${unit}`;
}

/** 볼륨 표시: "10,850kg" */
export function formatVolume(value: number, unit: WeightUnit = currentUnit()): string {
  return `${value.toLocaleString()}${unit}`;
}

/**
 * 목표량 표시: 범위면 "10~12회", 단일 값이면 "12회".
 * 버티는 운동(플랭크·월싯 등)은 "30초" 처럼 초 단위로 보여 준다.
 */
export function formatReps(
  range: { min: number; max: number },
  unit: RepUnit = 'reps',
): string {
  const suffix = unit === 'seconds' ? '초' : '회';
  return range.min === range.max
    ? `${range.max}${suffix}`
    : `${range.min}~${range.max}${suffix}`;
}
