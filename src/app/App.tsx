/**
 * 앱 셸 (Application Shell) — 07_ARCHITECTURE §13.
 *
 * 전역 Provider 구성:
 *  - ThemeProvider: <html data-theme> 적용(03 §6, FR-002)
 *  - SnackbarProvider: 전역 피드백(FB-001)
 *  - RouterProvider: 화면 라우팅(02 §7)
 *
 * 이 계층에는 비즈니스 로직을 두지 않는다(Presentation Layer).
 */
import { RouterProvider } from 'react-router-dom';
import { ThemeProvider } from '@hooks/useTheme';
import { SnackbarProvider } from '@components';
import { router } from './routes';

export function App() {
  return (
    <ThemeProvider>
      <SnackbarProvider>
        {/* A11Y-005: 키보드 사용자를 위한 본문 바로가기 */}
        <a href="#main" className="skip-link">
          본문으로 건너뛰기
        </a>
        <RouterProvider router={router} />
      </SnackbarProvider>
    </ThemeProvider>
  );
}
