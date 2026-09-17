/**
 * 앱에 내장된 운동 영상 목록.
 *
 * 사용법: 영상 파일을 `public/videos/{운동id}.mp4` 로 넣고(예: `chest-press.mp4`),
 *         아래 배열에 그 id 를 추가하면 앱이 자세 사진 대신 그 영상을 재생한다.
 *         (파일이 있어도 여기에 없으면 재생하지 않는다 — 불필요한 404 방지)
 *
 * 현재는 비어 있다. 38개 운동 전부 사용자가 준비한 자세 사진이 있어 기본 시각 자료는
 * 사진으로 통일했다. `public/videos/exercise_chest_press.mp4` 는 이전 실험본으로 남겨둔다.
 */
export const BUNDLED_VIDEO_IDS: readonly string[] = [];

export function hasBundledVideo(imageId: string): boolean {
  return BUNDLED_VIDEO_IDS.includes(imageId);
}
