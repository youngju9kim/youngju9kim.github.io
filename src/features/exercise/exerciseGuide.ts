/**
 * 운동 동작 순서(자세 가이드) 제공.
 * 문구는 사용자가 작성한 `data/운동정보.tsv` 의 단계1~3 을 그대로 쓴다.
 * 단계가 비어 있는 운동은 기존 메타데이터로 최소 단계를 생성(폴백).
 */
import type { Exercise } from '@models/exercise';
import { CATALOG } from './exercises.data';

const STEPS_BY_ID = new Map<string, string[]>(
  CATALOG.map((entry) => [entry.id, entry.steps]),
);

export function getGuideSteps(ex: Exercise): string[] {
  const steps = STEPS_BY_ID.get(ex.id);
  if (steps && steps.length > 0) return steps;
  // 폴백: 기존 메타데이터로 3단계 생성
  const setup = ex.formCues[0] ?? '머신에 바르게 앉거나 서서 안정적인 시작 자세를 잡는다.';
  const back = `반동 없이 천천히 원래 자세로 돌아온다.${ex.formCues[1] ? ` ${ex.formCues[1]}` : ''}`;
  return [setup, ex.breathingGuide, back];
}
