/**
 * HomePage — SC-001 Home (목업 기준 개편).
 * 인사말 + 오늘 요일/루틴 + 오늘 진행률 링 + 운동 시작 + 이번 주 요일 체크칩.
 * 관련: FR-003(루틴)·FR-005(운동 시작)·FR-014(통계).
 */
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Text,
  Button,
  IconButton,
  EmptyState,
  Icon,
  CircularProgress,
} from '@components';
import { routineRepository } from '@repositories/routineRepository';
import { favoriteRepository } from '@repositories/favoriteRepository';
import { workoutRepository } from '@repositories/workoutRepository';
import { settingsRepository } from '@repositories/settingsRepository';
import { workoutService } from '@services/workoutService';
import {
  todayDayOfWeekKorean,
  currentWeekDays,
  dateKey,
  formatDateKorean,
  nowISO,
} from '@utils/datetime';
import { formatVolume } from '@utils/format';
import styles from './Home.module.css';

export function HomePage() {
  const navigate = useNavigate();
  const todayRoutine = routineRepository.getMostRecent();
  const history = workoutRepository.getHistory();
  const recent = history[0];
  const activeSession = workoutRepository.getActiveSession();
  const userName = settingsRepository.getUserName();
  const favoriteRoutines = favoriteRepository
    .getAll()
    .map((fid) => routineRepository.getById(fid))
    .filter((r): r is NonNullable<typeof r> => !!r);

  // 오늘 진행률: 진행 중 세션 > 오늘 완료 기록 100% > 0%
  const todayKey = dateKey(nowISO());
  const workedOutToday = history.some((r) => dateKey(r.performedAt) === todayKey);
  const todayProgress = activeSession
    ? workoutService.getProgress(activeSession).percent
    : workedOutToday
      ? 100
      : 0;

  // 이번 주 운동한 날
  const workoutDays = new Set(history.map((r) => dateKey(r.performedAt)));
  const week = currentWeekDays();

  const start = (routineId: string) => {
    const routine = routineRepository.getById(routineId);
    if (!routine) return;
    navigate(`/today/${routine.id}`);
  };

  const greeting = userName ? `안녕하세요, ${userName}님 👋` : '안녕하세요 👋';

  return (
    <div className={styles.page}>
      {/* 헤더: 인사말 + 설정 바로가기 */}
      <header className={styles.header}>
        <Text variant="title" as="h1">
          {greeting}
        </Text>
        <IconButton icon="settings" label="설정" onClick={() => navigate('/settings')} />
      </header>

      {/* 진행 중 세션 복구 (EC-001) */}
      {activeSession ? (
        <Card interactive onClick={() => navigate('/workout')} aria-label="진행 중인 운동 이어서 하기">
          <Text variant="label" color="primary">
            진행 중인 운동이 있어요
          </Text>
          <Text variant="body" color="secondary" style={{ marginTop: 4 }}>
            {activeSession.routineName} · 이어서 하기
          </Text>
        </Card>
      ) : null}

      {todayRoutine ? (
        <>
          {/* 오늘의 운동 + 진행률 링 */}
          <Card>
            <Text variant="caption" color="secondary">
              오늘의 운동
            </Text>
            <Text variant="display" as="p" color="success" className={styles.today}>
              {todayDayOfWeekKorean()}
            </Text>
            <Text variant="body-large" color="secondary">
              {todayRoutine.name}
            </Text>

            <div className={styles.ringWrap}>
              <CircularProgress value={todayProgress} size={140} label="오늘 진행률">
                <div>
                  <Text variant="headline" as="p">
                    {Math.round(todayProgress)}%
                  </Text>
                  <Text variant="caption" color="secondary">
                    오늘 진행률
                  </Text>
                </div>
              </CircularProgress>
            </div>

            <Button
              fullWidth
              cta
              leftIcon="play"
              onClick={() => start(todayRoutine.id)}
              className={styles.startBtn}
            >
              운동 시작
            </Button>
          </Card>

          {/* 이번 주 운동 */}
          <Card>
            <Text variant="title" as="h2">
              이번 주 운동
            </Text>
            <div className={styles.week}>
              {week.map((d) => {
                const done = workoutDays.has(d.key);
                return (
                  <div
                    key={d.key}
                    className={[
                      styles.dayChip,
                      done && styles.dayDone,
                      d.isToday && styles.dayToday,
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <span className={styles.dayLabel}>{d.label}</span>
                    <span className={styles.dayMark} aria-hidden="true">
                      {done ? <Icon name="check" size="s" /> : '·'}
                    </span>
                    {done ? <span className="sr-only">운동함</span> : null}
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      ) : (
        <EmptyState
          illustration={<Icon name="trophy" size="xl" />}
          title="첫 루틴을 만들어 보세요"
          description="운동 목적과 시간을 고르면 머신 중심 루틴을 만들어 드려요."
          action={
            <Button cta leftIcon="plus" onClick={() => navigate('/routines/new')}>
              첫 루틴 만들기
            </Button>
          }
        />
      )}

      {/* 즐겨찾기 루틴 (FR-015) */}
      {favoriteRoutines.length > 0 ? (
        <div>
          <Text variant="caption" color="secondary" style={{ marginBottom: 8 }}>
            즐겨찾기 루틴
          </Text>
          <div className={styles.favList}>
            {favoriteRoutines.map((routine) => (
              <Card key={routine.id}>
                <div className={styles.favRow}>
                  <div style={{ minWidth: 0 }}>
                    <Text variant="body-large">{routine.name}</Text>
                    <Text variant="body-small" color="secondary">
                      운동 {routine.exercises.length}개 · 약 {routine.estimatedDurationMin}분
                    </Text>
                  </div>
                  <Button leftIcon="play" onClick={() => start(routine.id)}>
                    시작
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ) : null}

      {/* 최근 운동 */}
      {recent ? (
        <Card interactive onClick={() => navigate('/history')} aria-label="최근 운동 기록 보기">
          <Text variant="caption" color="secondary">
            최근 운동
          </Text>
          <Text variant="title" as="h2" style={{ marginTop: 4 }}>
            {recent.routineName}
          </Text>
          <Text variant="body-small" color="secondary" style={{ marginTop: 4 }}>
            {formatDateKorean(recent.performedAt)} · 총 볼륨 {formatVolume(recent.summary.totalVolume)}
          </Text>
        </Card>
      ) : null}
    </div>
  );
}
