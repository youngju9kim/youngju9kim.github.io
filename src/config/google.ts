/**
 * 구글 드라이브 동기화 설정.
 *
 * 기록은 사용자 본인의 구글 드라이브에만 저장된다. 우리 서버는 없다.
 * 요청하는 권한은 `drive.file` 하나뿐 — **이 앱이 만든 파일만** 읽고 쓸 수 있고,
 * 드라이브의 다른 파일에는 접근할 수 없다. (구글 분류상 비민감 범위라 앱 심사 불필요)
 *
 * ── 클라이언트 ID 발급 방법 (한 번만) ────────────────────────────
 *  1. console.cloud.google.com 에서 프로젝트 생성
 *  2. 'Google Drive API' 사용 설정
 *  3. OAuth 동의 화면: 외부(External) → 앱 이름/이메일 입력 → 게시(Production)
 *  4. 사용자 인증 정보 → OAuth 클라이언트 ID → 웹 애플리케이션
 *     - 승인된 JavaScript 원본:
 *         https://youngju9kim.github.io
 *         http://localhost:5173        (개발용)
 *  5. 발급된 클라이언트 ID 를 아래 GOOGLE_CLIENT_ID 에 붙여넣는다.
 *
 * 클라이언트 ID 는 비밀값이 아니다(브라우저에 노출되는 것이 정상). 공개 저장소에 두어도 된다.
 * 실제 접근 권한은 사용자가 구글 로그인 화면에서 직접 승인해야만 생긴다.
 */

/** 비어 있으면 앱은 드라이브 기능을 안내 문구로 대체하고 기기 저장만 사용한다. */
export const GOOGLE_CLIENT_ID = '';

/** 드라이브에 만들어지는 폴더 이름 — 사용자가 내 드라이브에서 직접 볼 수 있다. */
export const DRIVE_FOLDER_NAME = 'WorkoutCoach';

/** 이 앱이 만든 파일만 접근 (드라이브 전체 접근 아님) */
export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

export function isDriveConfigured(): boolean {
  return GOOGLE_CLIENT_ID.trim().length > 0;
}
