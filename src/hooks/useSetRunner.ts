/**
 * 세트 자동 진행 — '세트 시작하기' 를 누르면 카운트를 대신 세어 준다.
 *
 * 흐름:
 *   준비  "자세를 준비하세요" → prepSec 초 대기(마지막 3초는 초읽기)
 *   진행  반복 운동: "시작" 뒤 repTempoSec 초마다 "하나, 둘, 셋…" 호령
 *         버티기 운동: 목표 초를 세고, 10초·3초 남았을 때 알려 준다
 *   완료  "세트 완료"
 *
 * 시간은 setInterval 누적 오차를 피하려고 시작 시각 기준으로 매번 다시 계산한다.
 * (세트가 길어질수록 호령이 실제 박자에서 밀리는 것을 막는다)
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { speech, koreanCount } from '@services/speech';

/**
 * idle 은 '시작 버튼이 보이는 상태'다. 세트를 마치면 곧바로 idle 로 돌아간다 —
 * 완료 상태로 남겨 두면 다음 운동에서 카운트가 멈춘 채 시작 버튼이 나오지 않는다.
 */
export type RunnerPhase = 'idle' | 'prepare' | 'active';

export interface SetRunnerConfig {
  /** 'reps' = 반복 횟수, 'seconds' = 버티는 시간 */
  unit: 'reps' | 'seconds';
  /** 목표 횟수 또는 목표 초 */
  target: number;
  /** 시작 전 준비 시간(초) */
  prepSec: number;
  /** 반복 1회당 시간(초). 버티기 운동에는 쓰이지 않는다. */
  repTempoSec: number;
  /** 음성 안내 사용 여부 */
  voice: boolean;
  /** 목표를 다 채웠을 때 — 실제 수행한 값(횟수 또는 초)을 넘긴다 */
  onComplete: (achieved: number) => void;
}

interface RunnerState {
  phase: RunnerPhase;
  /** 진행 단계의 현재 카운트(횟수 또는 경과 초) */
  count: number;
  /** 준비 단계에서 남은 초 */
  prepRemaining: number;
}

const TICK_MS = 100;

export function useSetRunner(config: SetRunnerConfig) {
  const [state, setState] = useState<RunnerState>({
    phase: 'idle',
    count: 0,
    prepRemaining: config.prepSec,
  });

  const startedAt = useRef(0);
  /** 이미 소리 낸 지점 — 같은 숫자를 두 번 부르지 않게 한다 */
  const spoken = useRef(new Set<string>());
  /** 타이머 안에서 최신 설정을 보기 위한 참조 */
  const cfg = useRef(config);
  cfg.current = config;

  const say = useCallback((key: string, text: string, rate = 1) => {
    if (spoken.current.has(key)) return;
    spoken.current.add(key);
    if (cfg.current.voice) speech.speak(text, rate);
  }, []);

  /**
   * 세트 종료 — 시작 버튼이 보이는 상태로 되돌리고 기록을 넘긴다.
   * "세트 완료" 안내는 계속 들려야 하므로 speech 는 끊지 않는다.
   */
  const finish = useCallback((achieved: number) => {
    startedAt.current = 0;
    setState({ phase: 'idle', count: 0, prepRemaining: cfg.current.prepSec });
    cfg.current.onComplete(achieved);
  }, []);

  const stop = useCallback(() => {
    startedAt.current = 0;
    spoken.current.clear();
    speech.cancel();
    setState({ phase: 'idle', count: 0, prepRemaining: cfg.current.prepSec });
  }, []);

  const start = useCallback(() => {
    // iOS 는 사용자가 누른 그 순간에만 소리를 열 수 있다.
    if (cfg.current.voice) speech.prime();
    spoken.current.clear();
    spoken.current.add('prepare');
    startedAt.current = Date.now();
    setState({ phase: 'prepare', count: 0, prepRemaining: cfg.current.prepSec });
    if (cfg.current.voice) speech.speak('자세를 준비하세요');
  }, []);

  useEffect(() => {
    if (state.phase !== 'prepare' && state.phase !== 'active') return;

    const id = setInterval(() => {
      const elapsed = (Date.now() - startedAt.current) / 1000;
      const { unit, target, prepSec, repTempoSec } = cfg.current;

      /* ── 준비 단계 ── */
      if (elapsed < prepSec) {
        const remaining = Math.ceil(prepSec - elapsed);
        if (remaining <= 3) say(`prep-${remaining}`, String(remaining), 1.2);
        setState((s) =>
          s.phase === 'prepare' && s.prepRemaining === remaining
            ? s
            : { phase: 'prepare', count: 0, prepRemaining: remaining },
        );
        return;
      }

      const active = elapsed - prepSec;
      say('go', '시작', 1.1);

      /* ── 진행: 버티기 ── */
      if (unit === 'seconds') {
        if (active >= target) {
          say('done', '세트 완료');
          finish(target);
          return;
        }
        const passed = Math.floor(active);
        const remaining = target - passed;
        if (remaining === 10 && target > 15) say('hold-10', '10초 남았습니다');
        if (remaining <= 3) say(`hold-${remaining}`, String(remaining), 1.2);
        setState((s) =>
          s.phase === 'active' && s.count === passed
            ? s
            : { phase: 'active', count: passed, prepRemaining: 0 },
        );
        return;
      }

      /* ── 진행: 반복 호령 ── */
      // n번째 호령은 (n-1)*tempo 시점. 마지막 호령 뒤 tempo 만큼 더 기다렸다 끝낸다.
      if (active >= target * repTempoSec) {
        say('done', '세트 완료');
        finish(target);
        return;
      }
      const done = Math.min(Math.floor(active / repTempoSec) + 1, target);
      say(`rep-${done}`, koreanCount(done), 1.15);
      setState((s) =>
        s.phase === 'active' && s.count === done
          ? s
          : { phase: 'active', count: done, prepRemaining: 0 },
      );
    }, TICK_MS);

    return () => clearInterval(id);
  }, [state.phase, say, finish]);

  // 화면을 벗어나면 말하던 것을 멈춘다.
  useEffect(() => () => speech.cancel(), []);

  return {
    phase: state.phase,
    count: state.count,
    prepRemaining: state.prepRemaining,
    /** 진행 단계에서 목표 대비 진행률(0~100) */
    percent:
      state.phase === 'active'
        ? Math.min(100, (state.count / Math.max(1, config.target)) * 100)
        : 0,
    start,
    stop,
  };
}
