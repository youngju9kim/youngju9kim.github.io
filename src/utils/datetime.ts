/** 날짜/시간 유틸. EC-007(시스템 시간 변경) 대비 방어적 계산 포함. */

export function nowISO(): string {
  return new Date().toISOString();
}

/** 두 ISO 시각 사이 경과 초. 음수/비정상 값은 0 으로 보정(EC-007). */
export function elapsedSec(startISO: string, endISO: string): number {
  const start = new Date(startISO).getTime();
  const end = new Date(endISO).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  const diff = Math.round((end - start) / 1000);
  return diff > 0 ? diff : 0;
}

/** 초 → "31분" 또는 "1시간 5분" 형태 */
export function formatDuration(totalSec: number): string {
  const min = Math.round(totalSec / 60);
  if (min < 60) return `${min}분`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`;
}

/** 초 → "M:SS" (타이머 표시) */
export function formatClock(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

/** ISO → YYYY-MM-DD (로컬 기준 날짜 키) */
export function dateKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** ISO → "2026년 7월 3일" */
export function formatDateKorean(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

const DOW = ['일', '월', '화', '수', '목', '금', '토'];

/** 오늘 요일 "월요일" */
export function todayDayOfWeekKorean(): string {
  return `${DOW[new Date().getDay()]}요일`;
}

/** 이번 주(일~토) 각 날짜의 dateKey 와 요일 라벨 */
export function currentWeekDays(): { label: string; key: string; isToday: boolean }[] {
  const today = new Date();
  const todayKey = dateKey(today.toISOString());
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - today.getDay()); // 이번 주 일요일
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    const key = dateKey(d.toISOString());
    return { label: DOW[i], key, isToday: key === todayKey };
  });
}
