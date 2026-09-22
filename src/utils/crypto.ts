/**
 * 비밀번호(4자리 PIN)·보안질문 답변의 단방향 해시.
 *
 * 평문은 절대 저장하지 않는다. 기기 안에만 있는 데이터지만, 폰을 잃어버리거나
 * 백업 파일이 유출돼도 PIN 이 그대로 드러나지 않게 한다.
 *
 * PBKDF2-SHA256 을 쓰는 이유: 4자리 PIN 은 경우의 수가 1만 가지뿐이라 단순 해시는
 * 순식간에 전부 대입할 수 있다. 반복 횟수를 크게 잡아 한 번의 시도를 느리게 만든다.
 * (폰에서 약 0.1초 — 로그인 체감에는 영향이 없고, 1만 개 전수 대입은 수십 분이 된다)
 *
 * Web Crypto 는 보안 컨텍스트(https / localhost)에서만 동작한다. GitHub Pages 는 https 다.
 */

const ITERATIONS = 210_000;
const KEY_BITS = 256;

export interface HashedSecret {
  /** base64 해시 */
  hash: string;
  /** base64 솔트 */
  salt: string;
  /** 검증 시 같은 값을 써야 하므로 함께 저장 */
  iterations: number;
}

function toBase64(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  for (const b of view) binary += String.fromCharCode(b);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

async function derive(
  secret: string,
  salt: Uint8Array,
  iterations: number,
): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    keyMaterial,
    KEY_BITS,
  );
  return toBase64(bits);
}

/** 평문을 해시해 저장 가능한 형태로 만든다. */
export async function hashSecret(secret: string): Promise<HashedSecret> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(secret, salt, ITERATIONS);
  return { hash, salt: toBase64(salt), iterations: ITERATIONS };
}

/** 저장된 해시와 대조한다. 타이밍 차이로 정보가 새지 않도록 길이 고정 비교. */
export async function verifySecret(
  secret: string,
  stored: HashedSecret,
): Promise<boolean> {
  const computed = await derive(secret, fromBase64(stored.salt), stored.iterations);
  if (computed.length !== stored.hash.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ stored.hash.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * 보안질문 답변 정규화 — 띄어쓰기·대소문자 차이로 못 맞히는 일을 막는다.
 * ("홍 길동" / "홍길동" / "Hong Gildong" / "hong gildong" 을 같게 취급)
 */
export function normalizeAnswer(answer: string): string {
  return answer.trim().replace(/\s+/g, '').toLowerCase();
}
