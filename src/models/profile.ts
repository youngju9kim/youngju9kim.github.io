/**
 * 사용자 프로필 — 한 기기를 여러 사람이 쓰거나, 기록을 사람별로 나눠 담기 위한 단위.
 *
 * 서버가 없으므로 프로필은 기기(브라우저)에 저장되고, 2단계에서 사용자 본인의
 * 구글 드라이브로 동기화된다. 개인정보를 우리 쪽 서버에 두지 않는 것이 이 설계의 전제다.
 *
 * PIN 과 보안질문 답변은 평문으로 두지 않고 해시만 보관한다(utils/crypto).
 */
import type { EntityMeta } from './common';
import type { HashedSecret } from '@utils/crypto';

/** 비밀번호를 잊었을 때 본인 확인에 쓰는 질문 */
export interface SecurityQuestion {
  /** 질문 식별자 (SECURITY_QUESTIONS 의 키) */
  questionId: string;
  /** 정규화된 답변의 해시 */
  answer: HashedSecret;
}

export interface Profile extends EntityMeta {
  /** 로그인 화면에 표시되는 이름 */
  name: string;
  /**
   * 4자리 PIN 해시. null 이면 아직 설정하지 않은 상태로,
   * 기존 데이터를 옮겨온 프로필이 첫 로그인 때 PIN 을 정하도록 한다.
   */
  pin: HashedSecret | null;
  /** 비밀번호 찾기용 질문. 미설정이면 찾기 기능을 쓸 수 없다. */
  security: SecurityQuestion | null;
  /** 연속 실패 횟수 — 자동 잠금 판단용 */
  failedAttempts: number;
  /** 잠금 해제 시각(ISO). 현재 시각이 이보다 이르면 입력을 막는다. */
  lockedUntil: string | null;
  /** 마지막 로그인 시각(ISO) — 로그인 화면 정렬용 */
  lastLoginAt: string | null;
}

/** 선택 가능한 보안질문 */
export const SECURITY_QUESTIONS: { id: string; label: string }[] = [
  { id: 'phone4', label: '휴대폰 번호 뒤 4자리는?' },
  { id: 'father', label: '아버지 성함은?' },
  { id: 'mother', label: '어머니 성함은?' },
  { id: 'birthCity', label: '태어난 도시는?' },
  { id: 'school', label: '졸업한 초등학교 이름은?' },
  { id: 'pet', label: '처음 키운 반려동물 이름은?' },
  { id: 'nickname', label: '어릴 때 별명은?' },
];

export function securityQuestionLabel(questionId: string): string {
  return SECURITY_QUESTIONS.find((q) => q.id === questionId)?.label ?? '보안 질문';
}
