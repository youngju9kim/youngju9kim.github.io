/**
 * 운동 자세 사진 조회.
 *
 * 사진 원본은 사용자가 준비한 `<운동명>_{1,2,3}.jpg` 이며, `scripts/convert_photos.py` 가
 * `public/exercises/<id>-<단계>.webp` 로 변환해 앱과 함께 배포한다(오프라인 프리캐시 대상).
 * 어떤 단계에 사진이 있는지는 `exerciseCatalog.json` 의 photoSteps 가 갖고 있다.
 */
import { CATALOG } from './exercises.data';

const PHOTO_STEPS = new Map<string, number[]>(
  CATALOG.map((entry) => [entry.id, entry.photoSteps]),
);

function photoUrl(exerciseId: string, step: number): string {
  return `${import.meta.env.BASE_URL}exercises/${exerciseId}-${step}.webp`;
}

/** 해당 운동의 자세 사진 URL 목록(단계 순). 사진이 없으면 빈 배열. */
export function getExercisePhotos(exerciseId: string): string[] {
  const steps = PHOTO_STEPS.get(exerciseId);
  if (!steps || steps.length === 0) return [];
  return steps.map((step) => photoUrl(exerciseId, step));
}

/**
 * 가이드 단계(0-based)에 대응하는 사진 URL.
 * 사진 수가 단계 수보다 적으면 마지막 사진을 유지한다(단계 4~5개 운동 대응).
 */
export function getExercisePhotoForStep(
  exerciseId: string,
  stepIndex: number,
): string | null {
  const photos = getExercisePhotos(exerciseId);
  if (photos.length === 0) return null;
  const i = Math.min(Math.max(stepIndex, 0), photos.length - 1);
  return photos[i];
}
