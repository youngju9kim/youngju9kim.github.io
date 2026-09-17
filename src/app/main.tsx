import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { appService } from '@services/appService';
import '@styles/global.css';

// FR-001/FR-020: 최초 실행 초기화 + 저장 데이터 무결성 검사(손상 항목 자동 정리)
appService.init();

/**
 * 애플리케이션 진입점 (07_ARCHITECTURE §13 Application Shell).
 *
 * Phase 0: 최소 부트스트랩만 수행한다.
 * 이후 단계에서 앱 초기화(FR-001), 무결성 검사(FR-020), 라우팅,
 * 테마 적용이 이 부트 과정에 연결된다.
 */
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element(#root)를 찾을 수 없습니다.');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
