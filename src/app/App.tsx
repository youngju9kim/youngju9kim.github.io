/**
 * 앱 셸 (Application Shell) — 07_ARCHITECTURE §13.
 *
 * 전역 Provider 구성:
 *  - ThemeProvider: <html data-theme> 적용(03 §6, FR-002)
 *  - SnackbarProvider: 전역 피드백(FB-001)
 *  - AuthProvider: 프로필 로그인 상태
 *  - RouterProvider: 화면 라우팅(02 §7)
 *
 * 로그인하지 않았으면 라우터 대신 LoginPage 를 보여준다. 저장 키가 프로필별로 갈리므로
 * (storage/profileScope) 로그인한 프로필이 바뀌면 key 로 라우터를 새로 마운트해
 * 화면들이 새 프로필의 데이터를 처음부터 읽게 한다.
 *
 * 이 계층에는 비즈니스 로직을 두지 않는다(Presentation Layer).
 */
import { RouterProvider } from 'react-router-dom';
import { ThemeProvider } from '@hooks/useTheme';
import { AuthProvider, useAuth } from '@hooks/useAuth';
import { SnackbarProvider } from '@components';
import { LoginPage } from '@pages/LoginPage';
import { router } from './routes';

function AuthGate() {
  const { profile } = useAuth();
  if (!profile) return <LoginPage />;
  return <RouterProvider key={profile.id} router={router} />;
}

export function App() {
  return (
    <ThemeProvider>
      <SnackbarProvider>
        {/* A11Y-005: 키보드 사용자를 위한 본문 바로가기 */}
        <a href="#main" className="skip-link">
          본문으로 건너뛰기
        </a>
        <AuthProvider>
          <AuthGate />
        </AuthProvider>
      </SnackbarProvider>
    </ThemeProvider>
  );
}
