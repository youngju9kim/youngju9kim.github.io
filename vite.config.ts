import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

// 07_ARCHITECTURE / 06_DEVELOPMENT_GUIDE: PWA 기본 배포 형태, 오프라인 우선.
// 초기 버전 제외: 푸시 알림, 백그라운드 동기화 (06_DEVELOPMENT_GUIDE §21).
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.svg'],
      manifest: {
        name: 'Workout Coach',
        short_name: 'Workout',
        description: '50대 운동 복귀자를 위한 머신 중심 근력운동 코치',
        theme_color: '#15803D',
        background_color: '#FFFFFF',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        lang: 'ko',
        // Phase 0: SVG 아이콘 사용(최신 브라우저 지원). 정식 PNG 세트는 Phase 1 에셋 작업에서 추가.
        icons: [
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' },
          {
            src: 'icons/icon-maskable.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // 오프라인 우선: 앱 셸과 정적 자산을 프리캐시 (07_ARCHITECTURE §13).
        // 운동 사진(webp, 전체 약 1.7MB)도 프리캐시해야 헬스장에서 오프라인으로 자세를 볼 수 있다.
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        // SPA: 오프라인에서 어떤 라우트로 진입해도 앱 셸(index.html)로 폴백.
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        // 내장 운동 영상은 용량이 크므로 프리캐시 대신 최초 재생 시 런타임 캐시(오프라인 대응).
        runtimeCaching: [
          {
            urlPattern: ({ url }: { url: URL }) => url.pathname.startsWith('/videos/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'exercise-videos',
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 60 },
              rangeRequests: true,
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@app': path.resolve(__dirname, 'src/app'),
      '@pages': path.resolve(__dirname, 'src/pages'),
      '@layouts': path.resolve(__dirname, 'src/layouts'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@features': path.resolve(__dirname, 'src/features'),
      '@services': path.resolve(__dirname, 'src/services'),
      '@repositories': path.resolve(__dirname, 'src/repositories'),
      '@storage': path.resolve(__dirname, 'src/storage'),
      '@models': path.resolve(__dirname, 'src/models'),
      '@hooks': path.resolve(__dirname, 'src/hooks'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@constants': path.resolve(__dirname, 'src/constants'),
      '@config': path.resolve(__dirname, 'src/config'),
      '@styles': path.resolve(__dirname, 'src/styles'),
      '@assets': path.resolve(__dirname, 'src/assets'),
    },
  },
});
