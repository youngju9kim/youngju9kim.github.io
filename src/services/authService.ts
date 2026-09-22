/**
 * Auth Service — 프로필 생성·로그인·비밀번호 찾기.
 *
 * 서버가 없다. 프로필과 해시는 이 기기 안에만 있고, 검증도 전부 기기에서 한다.
 * 따라서 "아이디 찾기"는 이 기기에 저장된 프로필 목록을 보여주는 것이고,
 * "비밀번호 찾기"는 보안질문 답변을 대조해 새 PIN 을 정하게 하는 것이다.
 * (기기가 바뀌면 2단계의 구글 드라이브 복원으로 프로필을 가져온다)
 *
 * 4자리 PIN 은 경우의 수가 1만 가지뿐이라, 느린 해시(PBKDF2)와 자동 잠금을 함께 쓴다.
 */
import type { Profile, SecurityQuestion } from '@models/profile';
import { profileRepository } from '@repositories/profileRepository';
import { STORAGE_NAMESPACE } from '@constants/storage';
import { profileScope } from '@storage/profileScope';
import { hashSecret, verifySecret, normalizeAnswer } from '@utils/crypto';
import { createId } from '@utils/id';
import { nowISO } from '@utils/datetime';

/** 연속 실패 허용 횟수 — 이후부터 잠금이 걸린다 */
const FREE_ATTEMPTS = 5;
/** 잠금 기본 시간(초). 실패가 쌓일수록 2배씩, 최대 30분. */
const BASE_LOCK_SEC = 60;
const MAX_LOCK_SEC = 30 * 60;

export const PIN_LENGTH = 4;

export function isValidPin(pin: string): boolean {
  return new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin);
}

/** 너무 쉬운 PIN (1111, 1234, 0000 …) 은 막는다. */
export function isWeakPin(pin: string): boolean {
  if (/^(\d)\1+$/.test(pin)) return true; // 전부 같은 숫자
  const asc = '0123456789';
  const desc = '9876543210';
  return asc.includes(pin) || desc.includes(pin);
}

function lockSecondsFor(failedAttempts: number): number {
  const over = failedAttempts - FREE_ATTEMPTS;
  if (over < 0) return 0;
  return Math.min(BASE_LOCK_SEC * 2 ** over, MAX_LOCK_SEC);
}

/** 남은 잠금 시간(초). 0 이면 잠겨 있지 않다. */
export function lockRemainingSec(profile: Profile): number {
  if (!profile.lockedUntil) return 0;
  const diff = (new Date(profile.lockedUntil).getTime() - Date.now()) / 1000;
  return diff > 0 ? Math.ceil(diff) : 0;
}

export type LoginResult =
  | { ok: true; profile: Profile }
  | { ok: false; reason: 'wrong-pin'; remainingAttempts: number }
  | { ok: false; reason: 'locked'; lockSec: number }
  | { ok: false; reason: 'no-pin' }
  | { ok: false; reason: 'not-found' };

export const authService = {
  /** 이 기기에 저장된 프로필 목록 (아이디 찾기) */
  listProfiles(): Profile[] {
    return profileRepository.getAll();
  },

  hasAnyProfile(): boolean {
    return profileRepository.getAll().length > 0;
  },

  currentProfile(): Profile | null {
    const id = profileRepository.getActiveId();
    return id ? (profileRepository.getById(id) ?? null) : null;
  },

  /** 앱 시작 시 저장된 로그인 상태를 복원한다. */
  restoreSession(): Profile | null {
    const id = profileRepository.getActiveId();
    if (!id) return null;
    const profile = profileRepository.getById(id);
    if (!profile) {
      profileRepository.setActiveId(null);
      return null;
    }
    profileScope.set(id);
    return profile;
  },

  async createProfile(input: {
    name: string;
    pin: string;
    questionId: string;
    answer: string;
  }): Promise<{ ok: true; profile: Profile } | { ok: false; error: string }> {
    const name = input.name.trim();
    if (!name) return { ok: false, error: '이름을 입력해 주세요.' };
    if (profileRepository.nameTaken(name)) {
      return { ok: false, error: '이미 같은 이름의 프로필이 있습니다.' };
    }
    if (!isValidPin(input.pin)) {
      return { ok: false, error: `비밀번호는 숫자 ${PIN_LENGTH}자리로 입력해 주세요.` };
    }
    if (isWeakPin(input.pin)) {
      return { ok: false, error: '1234, 0000 처럼 쉬운 번호는 사용할 수 없습니다.' };
    }
    if (!normalizeAnswer(input.answer)) {
      return { ok: false, error: '보안 질문의 답을 입력해 주세요.' };
    }

    const now = nowISO();
    const profile: Profile = {
      id: createId('profile'),
      name,
      pin: await hashSecret(input.pin),
      security: {
        questionId: input.questionId,
        answer: await hashSecret(normalizeAnswer(input.answer)),
      },
      failedAttempts: 0,
      lockedUntil: null,
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now,
    };
    if (!profileRepository.save(profile)) {
      return { ok: false, error: '저장에 실패했습니다. 저장 공간을 확인해 주세요.' };
    }
    return { ok: true, profile };
  },

  async login(profileId: string, pin: string): Promise<LoginResult> {
    const profile = profileRepository.getById(profileId);
    if (!profile) return { ok: false, reason: 'not-found' };
    if (!profile.pin) return { ok: false, reason: 'no-pin' };

    const locked = lockRemainingSec(profile);
    if (locked > 0) return { ok: false, reason: 'locked', lockSec: locked };

    if (await verifySecret(pin, profile.pin)) {
      const updated: Profile = {
        ...profile,
        failedAttempts: 0,
        lockedUntil: null,
        lastLoginAt: nowISO(),
        updatedAt: nowISO(),
      };
      profileRepository.save(updated);
      profileRepository.setActiveId(updated.id);
      return { ok: true, profile: updated };
    }

    const failedAttempts = profile.failedAttempts + 1;
    const lockSec = lockSecondsFor(failedAttempts);
    profileRepository.save({
      ...profile,
      failedAttempts,
      lockedUntil: lockSec > 0 ? new Date(Date.now() + lockSec * 1000).toISOString() : null,
      updatedAt: nowISO(),
    });

    if (lockSec > 0) return { ok: false, reason: 'locked', lockSec };
    return { ok: false, reason: 'wrong-pin', remainingAttempts: FREE_ATTEMPTS - failedAttempts };
  },

  logout(): void {
    profileRepository.setActiveId(null);
  },

  /** 비밀번호 찾기 1단계: 보안질문 답변 확인 */
  async verifySecurityAnswer(profileId: string, answer: string): Promise<boolean> {
    const profile = profileRepository.getById(profileId);
    if (!profile?.security) return false;
    return verifySecret(normalizeAnswer(answer), profile.security.answer);
  },

  /** 비밀번호 찾기 2단계: 새 PIN 설정 (잠금도 함께 해제) */
  async resetPin(
    profileId: string,
    newPin: string,
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const profile = profileRepository.getById(profileId);
    if (!profile) return { ok: false, error: '프로필을 찾을 수 없습니다.' };
    if (!isValidPin(newPin)) {
      return { ok: false, error: `비밀번호는 숫자 ${PIN_LENGTH}자리로 입력해 주세요.` };
    }
    if (isWeakPin(newPin)) {
      return { ok: false, error: '1234, 0000 처럼 쉬운 번호는 사용할 수 없습니다.' };
    }
    profileRepository.save({
      ...profile,
      pin: await hashSecret(newPin),
      failedAttempts: 0,
      lockedUntil: null,
      updatedAt: nowISO(),
    });
    return { ok: true };
  },

  /** 로그인한 상태에서 비밀번호 변경 (현재 PIN 확인 필요) */
  async changePin(
    profileId: string,
    currentPin: string,
    newPin: string,
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const profile = profileRepository.getById(profileId);
    if (!profile?.pin) return { ok: false, error: '프로필을 찾을 수 없습니다.' };
    if (!(await verifySecret(currentPin, profile.pin))) {
      return { ok: false, error: '현재 비밀번호가 맞지 않습니다.' };
    }
    return this.resetPin(profileId, newPin);
  },

  /** 보안 질문 변경 */
  async setSecurityQuestion(
    profileId: string,
    questionId: string,
    answer: string,
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const profile = profileRepository.getById(profileId);
    if (!profile) return { ok: false, error: '프로필을 찾을 수 없습니다.' };
    if (!normalizeAnswer(answer)) return { ok: false, error: '답을 입력해 주세요.' };
    const security: SecurityQuestion = {
      questionId,
      answer: await hashSecret(normalizeAnswer(answer)),
    };
    profileRepository.save({ ...profile, security, updatedAt: nowISO() });
    return { ok: true };
  },

  /**
   * 프로필 도입 이전에 쌓인 데이터를 첫 프로필로 옮긴다.
   *
   * 기존 사용자는 `workoutcoach/routines` 같은 전역 키에 기록이 있다. 그대로 두면
   * 로그인 후 빈 화면이 보이므로, 프로필이 하나도 없고 옛 데이터가 있으면
   * 이름 '내 기록' 프로필을 만들어 키를 옮긴다. PIN 은 첫 로그인 때 정하게 한다.
   *
   * @returns 옮겨진 프로필 (옮길 게 없으면 null)
   */
  migrateLegacyData(): Profile | null {
    if (profileRepository.getAll().length > 0) return null;

    const legacyAreas = ['settings', 'routines', 'sessions', 'history', 'statistics', 'favorites'];
    const present = legacyAreas.filter((area) => {
      try {
        return localStorage.getItem(`${STORAGE_NAMESPACE}/${area}`) !== null;
      } catch {
        return false;
      }
    });
    if (present.length === 0) return null;

    const now = nowISO();
    const profile: Profile = {
      id: createId('profile'),
      name: '내 기록',
      pin: null, // 첫 로그인 때 설정
      security: null,
      failedAttempts: 0,
      lockedUntil: null,
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now,
    };
    if (!profileRepository.save(profile)) return null;

    for (const area of present) {
      const from = `${STORAGE_NAMESPACE}/${area}`;
      const to = `${STORAGE_NAMESPACE}/u/${profile.id}/${area}`;
      try {
        const value = localStorage.getItem(from);
        if (value === null) continue;
        localStorage.setItem(to, value);
        localStorage.removeItem(from);
      } catch {
        /* 일부 실패해도 나머지는 계속 옮긴다 */
      }
    }
    return profile;
  },
};
