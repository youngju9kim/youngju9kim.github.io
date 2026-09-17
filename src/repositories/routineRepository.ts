/**
 * Routine Repository — 07_ARCHITECTURE §9. 루틴 CRUD (FR-003/004/016).
 * LocalStorage 접근은 storageAdapter 로 캡슐화. 도메인 규칙은 포함하지 않는다.
 */
import { STORAGE_KEYS } from '@constants/storage';
import { storageAdapter } from '@storage/storageAdapter';
import type { Routine } from '@models/routine';
import { nowISO } from '@utils/datetime';

function readAll(): Routine[] {
  return storageAdapter.read<Routine[]>(STORAGE_KEYS.routines)?.data ?? [];
}

function writeAll(routines: Routine[]): boolean {
  return storageAdapter.write(STORAGE_KEYS.routines, routines);
}

export const routineRepository = {
  getAll(): Routine[] {
    return readAll();
  },

  getById(id: string): Routine | undefined {
    return readAll().find((r) => r.id === id);
  },

  /** 새 루틴 저장(이미 완성된 Routine 객체를 받음) */
  save(routine: Routine): boolean {
    const all = readAll();
    const idx = all.findIndex((r) => r.id === routine.id);
    if (idx >= 0) {
      all[idx] = { ...routine, updatedAt: nowISO() };
    } else {
      all.unshift(routine);
    }
    return writeAll(all);
  },

  remove(id: string): boolean {
    return writeAll(readAll().filter((r) => r.id !== id));
  },

  /** 가장 최근 수정된 루틴(오늘의 루틴 후보) */
  getMostRecent(): Routine | undefined {
    return readAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  },
};
