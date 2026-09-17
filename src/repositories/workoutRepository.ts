/**
 * Workout Repository — 07_ARCHITECTURE §9. 운동 세션 + 완료 기록 관리 (FR-005~011).
 *
 * - sessions: 진행 중 / 복구 대상 세션 (EC-001). 활성 세션 1개를 유지.
 * - history: 완료된 운동 기록 (FR-011). 최근 순 정렬 보관.
 * BR-007: 세트 완료 즉시 세션을 저장한다 → 활성 세션은 매 변경마다 write.
 */
import { STORAGE_KEYS } from '@constants/storage';
import { storageAdapter } from '@storage/storageAdapter';
import type { WorkoutSession, WorkoutRecord } from '@models/workout';

export const workoutRepository = {
  // ── 활성 세션 (진행 중) ──
  getActiveSession(): WorkoutSession | null {
    const session = storageAdapter.read<WorkoutSession>(STORAGE_KEYS.sessions)
      ?.data;
    return session && session.status === 'in-progress' ? session : null;
  },

  /** 활성 세션 저장(세트 완료 즉시 호출, BR-007) */
  saveActiveSession(session: WorkoutSession): boolean {
    return storageAdapter.write(STORAGE_KEYS.sessions, session);
  },

  clearActiveSession(): void {
    storageAdapter.remove(STORAGE_KEYS.sessions);
  },

  // ── 완료 기록(History) ──
  getHistory(): WorkoutRecord[] {
    return storageAdapter.read<WorkoutRecord[]>(STORAGE_KEYS.history)?.data ?? [];
  },

  getRecordById(id: string): WorkoutRecord | undefined {
    return this.getHistory().find((r) => r.id === id);
  },

  /** 완료 기록 추가(최근 순 맨 앞) */
  addRecord(record: WorkoutRecord): boolean {
    const history = this.getHistory();
    history.unshift(record);
    return storageAdapter.write(STORAGE_KEYS.history, history);
  },

  /** 특정 운동의 가장 최근 완료 기록 내 세트들 (이전 기록 비교용, FR-012) */
  getLastPerformanceOf(exerciseId: string): WorkoutRecord | undefined {
    return this.getHistory().find((rec) =>
      rec.exercises.some((e) => e.exerciseId === exerciseId),
    );
  },
};
