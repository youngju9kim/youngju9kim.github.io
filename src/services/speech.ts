/**
 * 음성 안내 — 운동 중 호령("하나, 둘, 셋…")과 단계 안내를 소리로 읽어 준다.
 *
 * 브라우저에 내장된 음성 합성(Web Speech API)을 쓴다. 음성 파일을 따로 만들지 않아
 * 용량이 들지 않고, 인터넷 없이 헬스장에서도 동작한다.
 *
 * 주의점:
 *  - iOS 는 사용자가 화면을 누른 뒤에만 소리를 낼 수 있다 → prime() 을 버튼 핸들러에서 호출한다.
 *  - 음성 목록(getVoices)은 비동기로 채워진다 → voiceschanged 를 기다린다.
 *  - 음성 기능이 없는 환경에서도 앱은 그대로 동작해야 한다(화면 카운트는 계속 보인다).
 */

let cachedVoice: SpeechSynthesisVoice | null = null;
let voicesReady = false;

function synth(): SpeechSynthesis | null {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
    ? window.speechSynthesis
    : null;
}

function pickKoreanVoice(): SpeechSynthesisVoice | null {
  const s = synth();
  if (!s) return null;
  const voices = s.getVoices();
  if (voices.length === 0) return null;
  voicesReady = true;
  return (
    voices.find((v) => v.lang === 'ko-KR') ??
    voices.find((v) => v.lang.startsWith('ko')) ??
    null
  );
}

function ensureVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice) return cachedVoice;
  cachedVoice = pickKoreanVoice();
  if (!voicesReady) {
    const s = synth();
    s?.addEventListener('voiceschanged', () => {
      cachedVoice = pickKoreanVoice();
    }, { once: true });
  }
  return cachedVoice;
}

/** 한국어 고유수사 — 호령용 ("하나, 둘 … 열둘 … 서른") */
const ONES = ['', '하나', '둘', '셋', '넷', '다섯', '여섯', '일곱', '여덟', '아홉'];
const TENS = ['', '열', '스물', '서른', '마흔', '쉰'];

export function koreanCount(n: number): string {
  if (n <= 0) return '';
  if (n < 10) return ONES[n];
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  if (tens >= TENS.length) return String(n); // 60 이상은 그냥 숫자로
  return TENS[tens] + ONES[ones];
}

export const speech = {
  isSupported(): boolean {
    return synth() !== null;
  },

  /**
   * iOS 등에서 소리를 열어 두기 위해 사용자 제스처 안에서 한 번 호출한다.
   * 빈 발화를 짧게 내보내 오디오 권한을 확보한다.
   */
  prime(): void {
    const s = synth();
    if (!s) return;
    try {
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      s.speak(u);
      ensureVoice();
    } catch {
      /* 음성이 없어도 운동은 계속된다 */
    }
  },

  /**
   * 말하기. 이전 발화는 끊는다 — 호령은 박자가 생명이라 밀리면 안 된다.
   * @param rate 기본 1.0. 호령처럼 짧은 말은 조금 빠르게 하면 박자에 잘 맞는다.
   */
  speak(text: string, rate = 1): void {
    const s = synth();
    if (!s || !text) return;
    try {
      s.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const voice = ensureVoice();
      if (voice) u.voice = voice;
      u.lang = 'ko-KR';
      u.rate = rate;
      u.pitch = 1;
      s.speak(u);
    } catch {
      /* 무시 */
    }
  },

  cancel(): void {
    try {
      synth()?.cancel();
    } catch {
      /* 무시 */
    }
  },
};
