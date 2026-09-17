/** 표시 포맷 유틸. 단위는 설정을 그대로 라벨로 사용(변환 없음). */
import { settingsRepository, type WeightUnit } from '@repositories/settingsRepository';

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

/** 목표 횟수 표시: 범위면 "10~12회", 단일 값이면 "12회" */
export function formatReps(range: { min: number; max: number }): string {
  return range.min === range.max ? `${range.max}회` : `${range.min}~${range.max}회`;
}
