/**
 * Favorite Repository — FR-015 즐겨찾기 루틴. 07_ARCHITECTURE §9.
 * 즐겨찾기한 루틴 ID 목록만 관리(루틴 본체는 Routine Repository 소유).
 */
import { STORAGE_KEYS } from '@constants/storage';
import { storageAdapter } from '@storage/storageAdapter';

function readAll(): string[] {
  return storageAdapter.read<string[]>(STORAGE_KEYS.favorites)?.data ?? [];
}

export const favoriteRepository = {
  getAll(): string[] {
    return readAll();
  },

  isFavorite(routineId: string): boolean {
    return readAll().includes(routineId);
  },

  toggle(routineId: string): boolean {
    const current = readAll();
    const next = current.includes(routineId)
      ? current.filter((id) => id !== routineId)
      : [...current, routineId];
    storageAdapter.write(STORAGE_KEYS.favorites, next);
    return next.includes(routineId);
  },

  remove(routineId: string): void {
    storageAdapter.write(
      STORAGE_KEYS.favorites,
      readAll().filter((id) => id !== routineId),
    );
  },
};
