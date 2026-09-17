# Workout Coach

50대 운동 복귀자를 위한 **머신 중심 근력운동 코치 PWA**.

> 설계 문서(단일 진실 공급원)는 [`docs/`](docs/) 에 있으며, 모든 구현은 이 문서들을
> 최우선 기준으로 따른다. 문서 우선순위는 `docs/08_MASTER_PROMPT_FINAL.md` §5 참조.

## 기술 스택

- React 18 + TypeScript + Vite
- PWA: `vite-plugin-pwa` (오프라인 우선, 홈 화면 설치)
- 스타일: CSS Custom Properties 기반 Design Token (Light/Dark)
- 저장소: LocalStorage (Repository Pattern 으로 캡슐화)

## 실행

```bash
npm install
npm run dev        # 개발 서버
npm run build      # 프로덕션 빌드
npm run typecheck  # 타입 검사
```

## 아키텍처

5계층 단방향 의존 (07_ARCHITECTURE):

```
Presentation → Application → Domain → Infrastructure → Platform
```

- UI 는 LocalStorage 에 직접 접근하지 않는다 (Repository 경유).
- UI 는 비즈니스 로직을 포함하지 않는다 (Service 계층 담당).

## 폴더 구조 (06_DEVELOPMENT_GUIDE §6)

| 경로                 | 책임                                   |
| ------------------ | ------------------------------------ |
| `src/app/`         | 앱 진입점 / 셸                            |
| `src/pages/`       | 화면 단위 (SC-001 ~ SC-010)              |
| `src/layouts/`     | 공통 레이아웃 (Main / Workout / Fullscreen) |
| `src/components/`  | 공통 UI 컴포넌트 (CMP-001 ~ CMP-010)       |
| `src/features/`    | 도메인 기능 (routine / workout / …)       |
| `src/services/`    | 비즈니스 로직                              |
| `src/repositories/`| 데이터 접근 계층                           |
| `src/storage/`     | LocalStorage Adapter                 |
| `src/models/`      | 도메인 모델 (TS 타입)                       |
| `src/hooks/`       | 공통 로직 훅                              |
| `src/utils/`       | 공용 유틸리티                              |
| `src/constants/`   | 상수 (LocalStorage 키 등)               |
| `src/styles/`      | Design Token 기반 스타일                  |

## 구현 진행 (08_MASTER_PROMPT Implementation Order)

- [x] **Phase 0** — 프로젝트 골격, PWA 뼈대, LocalStorage 키 구조, 문서 복사
- [x] **Phase 1** — Design Token(→ `docs/DESIGN_TOKENS_DERIVED.md`) · 공통 컴포넌트(CMP-001~010 + 피드백/진행/로딩) · 레이아웃 · Bottom Navigation · Light/Dark 테마
- [x] **Phase 2** — 도메인 모델 · Exercise DB 22종(→ `docs/EXERCISE_DATA_DERIVED.md`) · Repository/Service · 루틴 자동생성(FR-003) · Home · Routine 목록/생성/편집 · Workout Session(자동저장) · Rest Timer · Summary(PR·통계)
- [x] **Phase 3** — History 목록/상세(FR-011/012) · Statistics 차트(FR-014) · Settings 단위·휴식·백업/복원/초기화(FR-002/017/018/019) · 즐겨찾기(FR-015) · 운동 검색(편집 화면) · 데이터 무결성/초기화(FR-001/020)
- [x] **Phase 4** — 성능(라우트 코드 스플리팅) · 접근성(스킵링크·랜드마크·헤딩·AA) · 오프라인(PWA SW·navigateFallback) · 반응형(태블릿/데스크톱 2·3열) · 세션 복구(EC-001)·재실행 데이터 유지 검증

**MVP 4개 Phase 완료.** 전 기능 브라우저 검증 완료(typecheck·build 통과, 콘솔 에러 0).
