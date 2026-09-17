/** 유튜브 URL → 영상 ID 추출 + 임베드 URL 생성. */

/** 다양한 형식(watch?v=, youtu.be/, shorts/, embed/)에서 11자리 ID 추출 */
export function parseYouTubeId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?[^#]*\bv=)([A-Za-z0-9_-]{11})/,
    /(?:youtu\.be\/)([A-Za-z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  // 순수 ID 를 그대로 입력한 경우
  if (/^[A-Za-z0-9_-]{11}$/.test(url.trim())) return url.trim();
  return null;
}

/**
 * 임베드 URL 생성. 자동재생·음소거·컨트롤 최소·구간(start/end)·반복(playlist trick).
 * 주: 기본 임베드의 loop 는 전체 영상을 반복하며 start 는 최초 재생에만 적용된다.
 */
export function buildYouTubeEmbedUrl(
  id: string,
  startSec?: number,
  endSec?: number,
): string {
  const params = new URLSearchParams({
    autoplay: '1',
    mute: '1',
    controls: '0',
    loop: '1',
    playlist: id,
    playsinline: '1',
    modestbranding: '1',
    rel: '0',
  });
  if (startSec && startSec > 0) params.set('start', String(Math.floor(startSec)));
  if (endSec && endSec > 0) params.set('end', String(Math.floor(endSec)));
  return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
}
