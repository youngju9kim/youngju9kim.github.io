/** 고유 ID 생성. crypto.randomUUID 우선, 미지원 환경은 폴백. */
export function createId(prefix = ''): string {
  let uuid: string;
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    uuid = crypto.randomUUID();
  } else {
    uuid = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
  return prefix ? `${prefix}_${uuid}` : uuid;
}
