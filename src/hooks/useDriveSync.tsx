/**
 * 구글 드라이브 자동 동기화.
 *
 * 사용자가 "동기화" 를 의식하지 않아도 되게, 아래 시점에 조용히 올린다:
 *  - 운동을 마쳤을 때 (가장 중요한 데이터가 생기는 순간)
 *  - 앱을 벗어날 때 (탭 전환·홈 버튼 — 모바일에서 가장 확실한 저장 시점)
 *  - 로그인 직후 한 번
 *
 * 실패해도 앱 사용을 막지 않는다. 기록은 이미 기기에 저장돼 있고,
 * 드라이브는 그 사본을 두는 곳이기 때문이다. 실패는 설정 화면에 상태로만 남긴다.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { googleDrive, DriveError } from '@services/googleDrive';
import { profileSync } from '@services/profileSync';
import { driveStateRepository } from '@repositories/driveStateRepository';
import { useAuth } from '@hooks/useAuth';
import { DATA_CHANGED_EVENT } from '@utils/events';

export type SyncStatus = 'off' | 'idle' | 'syncing' | 'error' | 'needs-reconnect';

interface DriveSyncValue {
  status: SyncStatus;
  lastSyncedAt: string | null;
  error: string | null;
  /** 사용자가 버튼을 눌러 연결 (구글 동의 창) */
  connect: () => Promise<void>;
  disconnect: () => void;
  /** 지금 올리기 */
  syncNow: () => Promise<void>;
}

const DriveSyncContext = createContext<DriveSyncValue | null>(null);

export function DriveSyncProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const profileId = profile?.id ?? null;

  const [status, setStatus] = useState<SyncStatus>(() =>
    googleDrive.isConfigured() && driveStateRepository.isEnabled() ? 'idle' : 'off',
  );
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** 동시에 두 번 올라가지 않도록 */
  const uploading = useRef(false);

  useEffect(() => {
    setLastSyncedAt(profileId ? driveStateRepository.getLastSyncedAt(profileId) : null);
  }, [profileId]);

  const upload = useCallback(async () => {
    if (!profileId || uploading.current) return;
    if (!driveStateRepository.isEnabled()) return;

    uploading.current = true;
    setStatus('syncing');
    setError(null);
    try {
      if (!googleDrive.isConnected()) await googleDrive.reconnectSilently();
      const { syncedAt } = await profileSync.upload(profileId);
      driveStateRepository.setLastSyncedAt(profileId, syncedAt);
      setLastSyncedAt(syncedAt);
      setStatus('idle');
    } catch (e) {
      const drive = e instanceof DriveError ? e : null;
      setError(drive?.message ?? '동기화에 실패했습니다.');
      setStatus(drive?.needsReconnect ? 'needs-reconnect' : 'error');
    } finally {
      uploading.current = false;
    }
  }, [profileId]);

  const connect = useCallback(async () => {
    setStatus('syncing');
    setError(null);
    try {
      await googleDrive.connect();
      driveStateRepository.setEnabled(true);
      setStatus('idle');
      await upload();
    } catch (e) {
      setError(e instanceof DriveError ? e.message : '구글 계정 연결에 실패했습니다.');
      setStatus('error');
    }
  }, [upload]);

  const disconnect = useCallback(() => {
    googleDrive.disconnect();
    driveStateRepository.reset();
    setStatus('off');
    setError(null);
  }, []);

  // 로그인 직후 1회 + 데이터 변경 + 앱을 벗어날 때
  useEffect(() => {
    if (!profileId || !driveStateRepository.isEnabled()) return;

    void upload();

    const onChanged = () => void upload();
    const onHidden = () => {
      if (document.visibilityState === 'hidden') void upload();
    };
    window.addEventListener(DATA_CHANGED_EVENT, onChanged);
    document.addEventListener('visibilitychange', onHidden);
    return () => {
      window.removeEventListener(DATA_CHANGED_EVENT, onChanged);
      document.removeEventListener('visibilitychange', onHidden);
    };
  }, [profileId, upload]);

  const value = useMemo(
    () => ({ status, lastSyncedAt, error, connect, disconnect, syncNow: upload }),
    [status, lastSyncedAt, error, connect, disconnect, upload],
  );

  return <DriveSyncContext.Provider value={value}>{children}</DriveSyncContext.Provider>;
}

export function useDriveSync(): DriveSyncValue {
  const ctx = useContext(DriveSyncContext);
  if (!ctx) throw new Error('useDriveSync 는 DriveSyncProvider 안에서만 사용할 수 있습니다.');
  return ctx;
}
