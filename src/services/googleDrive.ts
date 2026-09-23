/**
 * Google Drive 접근 계층 — 로그인(토큰 발급)과 파일 읽기/쓰기.
 *
 * 브라우저만으로 동작하는 방식(Google Identity Services 토큰 모델)을 쓴다.
 * 서버가 없으므로 refresh token 은 받지 않고, 1시간짜리 액세스 토큰을 메모리에만 둔다.
 * 토큰이 만료되면 사용자가 이미 권한을 준 상태에서 조용히 재발급한다(prompt: '').
 *
 * 토큰을 localStorage 에 저장하지 않는 이유: 저장해도 1시간 뒤 어차피 만료되고,
 * 남겨두면 기기를 잃었을 때 드라이브 접근 수단이 그대로 남기 때문이다.
 */
import {
  GOOGLE_CLIENT_ID,
  DRIVE_SCOPE,
  DRIVE_FOLDER_NAME,
  isDriveConfigured,
} from '@config/google';

/* ── Google Identity Services 타입 (필요한 부분만) ─────────────── */
interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}
interface TokenClient {
  requestAccessToken(overrides?: { prompt?: string }): void;
}
interface GoogleGlobal {
  accounts: {
    oauth2: {
      initTokenClient(config: {
        client_id: string;
        scope: string;
        callback: (response: TokenResponse) => void;
        error_callback?: (error: { type?: string }) => void;
      }): TokenClient;
      revoke(token: string, done?: () => void): void;
    };
  };
}
declare global {
  interface Window {
    google?: GoogleGlobal;
  }
}

const GIS_SRC = 'https://accounts.google.com/gsi/client';

let scriptPromise: Promise<void> | null = null;
let accessToken: string | null = null;
let tokenExpiresAt = 0;

export class DriveError extends Error {
  constructor(
    message: string,
    /** 다시 연결(재승인)이 필요한 상황인지 */
    readonly needsReconnect = false,
  ) {
    super(message);
    this.name = 'DriveError';
  }
}

function loadScript(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve();
    const el = document.createElement('script');
    el.src = GIS_SRC;
    el.async = true;
    el.defer = true;
    el.onload = () => resolve();
    el.onerror = () =>
      reject(new DriveError('구글 로그인 스크립트를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.'));
    document.head.appendChild(el);
  });
  return scriptPromise;
}

/** 스크립트 로딩과 설정을 확인하고 oauth2 네임스페이스를 돌려준다. */
async function ensureReady(): Promise<GoogleGlobal['accounts']['oauth2']> {
  if (!isDriveConfigured()) {
    throw new DriveError('구글 드라이브 설정이 아직 준비되지 않았습니다.');
  }
  await loadScript();
  const oauth2 = window.google?.accounts?.oauth2;
  if (!oauth2) throw new DriveError('구글 로그인을 사용할 수 없습니다.');
  return oauth2;
}

/**
 * 액세스 토큰 요청.
 * @param interactive true 면 구글 계정 선택/동의 창을 띄운다(사용자가 버튼을 눌렀을 때만).
 *                    false 면 이미 승인된 경우에만 조용히 발급받는다.
 */
async function requestToken(interactive: boolean): Promise<string> {
  const oauth2 = await ensureReady();

  return new Promise<string>((resolve, reject) => {
    // initTokenClient 는 콜백이 고정이라, 요청마다 새로 만들어 이번 결과를 받는다.
    const client: TokenClient = oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: DRIVE_SCOPE,
      callback: (res) => {
        if (res.error || !res.access_token) {
          reject(
            new DriveError(
              interactive
                ? '구글 계정 연결이 취소되었습니다.'
                : '구글 드라이브 연결이 만료되었습니다. 다시 연결해 주세요.',
              true,
            ),
          );
          return;
        }
        accessToken = res.access_token;
        // 만료 1분 전부터는 새로 받는다.
        tokenExpiresAt = Date.now() + ((res.expires_in ?? 3600) - 60) * 1000;
        resolve(accessToken);
      },
      error_callback: () =>
        reject(
          new DriveError(
            interactive
              ? '구글 계정 연결에 실패했습니다.'
              : '구글 드라이브 연결이 만료되었습니다. 다시 연결해 주세요.',
            true,
          ),
        ),
    });
    client.requestAccessToken({ prompt: interactive ? 'consent' : '' });
  });
}

async function validToken(): Promise<string> {
  if (accessToken && Date.now() < tokenExpiresAt) return accessToken;
  return requestToken(false);
}

async function driveFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = await validToken();
  const res = await fetch(url, {
    ...init,
    headers: { ...(init.headers ?? {}), Authorization: `Bearer ${token}` },
  });
  if (res.status === 401 || res.status === 403) {
    accessToken = null;
    throw new DriveError('구글 드라이브 접근 권한이 없습니다. 다시 연결해 주세요.', true);
  }
  if (!res.ok) {
    throw new DriveError(`구글 드라이브 요청에 실패했습니다. (${res.status})`);
  }
  return res;
}

export interface DriveFile {
  id: string;
  name: string;
  modifiedTime: string;
}

export const googleDrive = {
  isConfigured: isDriveConfigured,

  /** 이번 세션에서 토큰을 갖고 있는지 */
  isConnected(): boolean {
    return accessToken !== null && Date.now() < tokenExpiresAt;
  },

  /** 사용자가 버튼을 눌러 처음 연결할 때 — 구글 동의 창이 뜬다. */
  async connect(): Promise<void> {
    await requestToken(true);
  },

  /** 앱 시작 시 조용히 재연결. 실패하면 DriveError(needsReconnect). */
  async reconnectSilently(): Promise<void> {
    await requestToken(false);
  },

  /** 연결 해제 — 토큰을 폐기한다(드라이브의 파일은 지우지 않는다). */
  disconnect(): void {
    const token = accessToken;
    accessToken = null;
    tokenExpiresAt = 0;
    if (token) {
      try {
        window.google?.accounts.oauth2.revoke(token);
      } catch {
        /* 폐기 실패해도 로컬 토큰은 이미 버렸다 */
      }
    }
  },

  /** 앱 폴더를 찾고, 없으면 만든다. */
  async ensureFolder(): Promise<string> {
    const q = encodeURIComponent(
      `name='${DRIVE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    );
    const res = await driveFetch(
      `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)&pageSize=1`,
    );
    const found = (await res.json()) as { files?: { id: string }[] };
    if (found.files?.length) return found.files[0].id;

    const created = await driveFetch('https://www.googleapis.com/drive/v3/files?fields=id', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: DRIVE_FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });
    return ((await created.json()) as { id: string }).id;
  },

  /** 폴더 안의 파일 목록 (이 앱이 만든 것만 보인다 — drive.file 범위) */
  async listFiles(folderId: string): Promise<DriveFile[]> {
    const q = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
    const res = await driveFetch(
      `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime)&pageSize=100&orderBy=modifiedTime desc`,
    );
    return ((await res.json()) as { files?: DriveFile[] }).files ?? [];
  },

  async readFile(fileId: string): Promise<string> {
    const res = await driveFetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    );
    return res.text();
  },

  /** 같은 이름의 파일이 있으면 덮어쓰고, 없으면 새로 만든다. */
  async writeFile(folderId: string, name: string, content: string): Promise<string> {
    const existing = (await this.listFiles(folderId)).find((f) => f.name === name);

    if (existing) {
      await driveFetch(
        `https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=media`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: content,
        },
      );
      return existing.id;
    }

    // 새 파일: 메타데이터 + 내용을 multipart 로 함께 보낸다.
    const boundary = `wc${Math.random().toString(36).slice(2)}`;
    const body =
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${JSON.stringify({ name, parents: [folderId] })}\r\n` +
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${content}\r\n--${boundary}--`;

    const res = await driveFetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
      {
        method: 'POST',
        headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
        body,
      },
    );
    return ((await res.json()) as { id: string }).id;
  },

  async deleteFile(fileId: string): Promise<void> {
    await driveFetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
    });
  },
};
