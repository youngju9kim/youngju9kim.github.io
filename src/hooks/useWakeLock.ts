/**
 * 운동 중 화면 꺼짐 방지.
 *
 * 세트를 자동으로 세어 주는 동안 화면이 꺼지면 카운트를 볼 수 없다.
 * Screen Wake Lock 은 지원하지 않는 브라우저도 있으므로 실패해도 조용히 넘어간다.
 * (화면이 꺼져도 음성 안내는 계속되므로 운동 자체는 이어갈 수 있다)
 */
import { useEffect } from 'react';

interface WakeLockSentinelLike {
  released: boolean;
  release(): Promise<void>;
  addEventListener(type: 'release', listener: () => void): void;
}

interface WakeLockLike {
  request(type: 'screen'): Promise<WakeLockSentinelLike>;
}

function getWakeLock(): WakeLockLike | null {
  const nav = navigator as Navigator & { wakeLock?: WakeLockLike };
  return nav.wakeLock ?? null;
}

export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const api = getWakeLock();
    if (!api) return;

    let sentinel: WakeLockSentinelLike | null = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        const lock = await api.request('screen');
        if (cancelled) {
          void lock.release();
          return;
        }
        sentinel = lock;
      } catch {
        /* 배터리 절약 모드 등으로 거부될 수 있다 — 무시 */
      }
    };

    // 다른 앱에 갔다 돌아오면 잠금이 풀려 있다 → 다시 잡는다.
    const onVisible = () => {
      if (document.visibilityState === 'visible' && (!sentinel || sentinel.released)) {
        void acquire();
      }
    };

    void acquire();
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      if (sentinel && !sentinel.released) void sentinel.release();
    };
  }, [active]);
}
