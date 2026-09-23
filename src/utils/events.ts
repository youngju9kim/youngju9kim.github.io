/**
 * 계층 간 느슨한 알림용 브라우저 이벤트.
 *
 * Service 계층이 UI 훅을 직접 참조하면 의존 방향이 뒤집히므로(07 §5 단방향),
 * 중립적인 이벤트로만 알리고 구독은 상위 계층에서 한다.
 */

/** 저장된 운동 데이터가 바뀌었음 — 드라이브 동기화 트리거 */
export const DATA_CHANGED_EVENT = 'workoutcoach:data-changed';

export function notifyDataChanged(): void {
  window.dispatchEvent(new CustomEvent(DATA_CHANGED_EVENT));
}
