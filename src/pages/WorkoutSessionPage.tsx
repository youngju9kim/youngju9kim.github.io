/**
 * WorkoutSessionPage — SC-004 Workout Session + SC-005 Rest Timer (목업 기준 개편).
 *
 * 운동별 흐름: ① 자세 가이드 캐러셀(시작자세→동작→복귀) → ② 세트 진행(큰 원형 반복 카운터)
 * → 세트 완료(자동 저장, BR-007) → 휴식(다크 풀스크린) → 다음 세트/운동 → 완료 시 요약.
 * FR-005~009.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Text,
  Button,
  IconButton,
  Card,
  RepsCounter,
  Stepper,
  LinearProgress,
  CircularProgress,
  Dialog,
} from '@components';
import { ExerciseVideo } from '@features/exercise/ExerciseVideo';
import { getGuideSteps } from '@features/exercise/exerciseGuide';
import { workoutRepository } from '@repositories/workoutRepository';
import { exerciseRepository } from '@repositories/exerciseRepository';
import { workoutService } from '@services/workoutService';
import type { WorkoutSession } from '@models/workout';
import { formatClock } from '@utils/datetime';
import { currentUnit, formatReps } from '@utils/format';
import styles from './Workout.module.css';

function findCursor(
  session: WorkoutSession,
): { exerciseIndex: number; setNumber: number } | null {
  for (let i = 0; i < session.exercises.length; i++) {
    const set = session.exercises[i].sets.find((s) => !s.completed);
    if (set) return { exerciseIndex: i, setNumber: set.setNumber };
  }
  return null;
}

export function WorkoutSessionPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<WorkoutSession | null>(() =>
    workoutRepository.getActiveSession(),
  );
  const [weight, setWeight] = useState(0);
  const [reps, setReps] = useState(0);
  const [rest, setRest] = useState<{ remaining: number; total: number } | null>(null);
  const [exitOpen, setExitOpen] = useState(false);
  /** 현재 세트 로깅 중인 운동 인덱스. null 이거나 cursor 와 다르면 가이드 단계. */
  const [logExercise, setLogExercise] = useState<number | null>(null);
  const [guideStep, setGuideStep] = useState(0);

  const cursor = useMemo(() => (session ? findCursor(session) : null), [session]);

  useEffect(() => {
    if (!session) navigate('/', { replace: true });
  }, [session, navigate]);

  // 커서 이동 시 입력 기본값 초기화
  useEffect(() => {
    if (!session || !cursor) return;
    const set = session.exercises[cursor.exerciseIndex].sets.find(
      (s) => s.setNumber === cursor.setNumber,
    );
    if (set) {
      setWeight(set.weight);
      setReps(set.reps);
    }
  }, [session, cursor]);

  // 자세 가이드 자막 자동 순환(1.6초 간격). 세트 로깅 단계에서는 멈춘다.
  useEffect(() => {
    if (!session || !cursor) return;
    const ei = cursor.exerciseIndex;
    if (logExercise === ei) return; // 로그 단계
    const ex = exerciseRepository.getById(session.exercises[ei].exerciseId);
    if (!ex) return;
    const n = getGuideSteps(ex).length;
    if (n <= 1) return;
    const t = setInterval(() => setGuideStep((s) => (s + 1) % n), 1600);
    return () => clearInterval(t);
  }, [session, cursor, logExercise]);

  // 휴식 카운트다운 (FR-008)
  useEffect(() => {
    if (!rest) return;
    if (rest.remaining <= 0) {
      setRest(null);
      return;
    }
    const t = setTimeout(
      () => setRest((r) => (r ? { ...r, remaining: r.remaining - 1 } : r)),
      1000,
    );
    return () => clearTimeout(t);
  }, [rest]);

  if (!session || !cursor) return null;

  const exIndex = cursor.exerciseIndex;
  const sessionExercise = session.exercises[exIndex];
  const exercise = exerciseRepository.getById(sessionExercise.exerciseId);
  if (!exercise) return null;

  const unit = currentUnit();
  const progress = workoutService.getProgress(session);
  const totalExercises = session.exercises.length;
  const inLogPhase = logExercise === exIndex;
  const guideSteps = getGuideSteps(exercise);

  const handleComplete = () => {
    if (reps <= 0) return;
    const updated = workoutService.completeSet(session, exIndex, cursor.setNumber, weight, reps);
    const nextCursor = findCursor(updated);

    if (!nextCursor) {
      const result = workoutService.finalize(updated);
      if (result) navigate(`/workout/summary/${result.record.id}`, { replace: true });
      else setSession(updated);
      return;
    }
    setSession(updated);
    if (nextCursor.exerciseIndex !== exIndex) {
      workoutService.setCurrentExercise(updated, nextCursor.exerciseIndex);
      setLogExercise(null); // 새 운동 → 가이드 단계로
      setGuideStep(0);
    }
    if (sessionExercise.restSec > 0) {
      setRest({ remaining: sessionExercise.restSec, total: sessionExercise.restSec });
    }
  };

  const handleExit = () => {
    setExitOpen(false);
    if (progress.completedSets > 0) {
      const result = workoutService.finalize(session);
      if (result) {
        navigate(`/workout/summary/${result.record.id}`, { replace: true });
        return;
      }
    }
    workoutService.abandon();
    navigate('/', { replace: true });
  };

  return (
    <div className={styles.session}>
      {/* Header */}
      <header className={styles.header}>
        <div>
          <Text variant="title" as="h1">
            {exercise.displayName}
          </Text>
          <Text variant="body-small" color="secondary">
            {sessionExercise.targetSets}세트 × {formatReps(sessionExercise.targetReps)}
          </Text>
        </div>
        <IconButton icon="stop" label="운동 종료" tone="danger" onClick={() => setExitOpen(true)} />
      </header>

      <LinearProgress
        value={progress.percent}
        label={`운동 ${exIndex + 1} / ${totalExercises}`}
      />

      {!inLogPhase ? (
        /* ── ① 자세 가이드: 영상 80% + 하단 자동 순환 자막 ── */
        <div className={styles.guide}>
          <div className={styles.videoArea}>
            <ExerciseVideo exercise={exercise} variant="fill" step={guideStep} />
            <div className={styles.caption}>
              <p className={styles.captionText}>
                <span className={styles.captionNum}>{guideStep + 1}</span>
                {guideSteps[guideStep]}
              </p>
              <div className={styles.dots} aria-hidden="true">
                {guideSteps.map((_, i) => (
                  <span
                    key={i}
                    className={[styles.dot, i === guideStep && styles.dotActive]
                      .filter(Boolean)
                      .join(' ')}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className={styles.guideFooter}>
            <Button fullWidth cta leftIcon="play" onClick={() => setLogExercise(exIndex)}>
              세트 시작하기
            </Button>
          </div>
        </div>
      ) : (
        /* ── ② 세트 진행 ── */
        <div className={styles.log}>
          <Text variant="title" as="h2" color="success" style={{ textAlign: 'center' }}>
            세트 {cursor.setNumber} / {sessionExercise.targetSets}
          </Text>

          <Text variant="caption" color="secondary" style={{ textAlign: 'center' }}>
            반복 횟수
          </Text>
          <RepsCounter
            value={reps}
            target={sessionExercise.targetReps.max}
            onChange={setReps}
            max={100}
          />

          <div className={styles.weightRow}>
            <Stepper
              label="중량"
              value={weight}
              min={0}
              max={500}
              step={2.5}
              allowDecimal
              unit={unit}
              onChange={setWeight}
            />
          </div>

          {exercise.formCues.length > 0 ? (
            <Card className={styles.tip}>
              <Text variant="body-small" color="secondary">
                💡 TIP · {exercise.formCues[0]}
              </Text>
            </Card>
          ) : null}

          <div className={styles.logFooter}>
            <Button fullWidth cta leftIcon="check" onClick={handleComplete} disabled={reps <= 0}>
              세트 완료
            </Button>
            {reps <= 0 ? (
              <Text variant="caption" color="secondary" style={{ textAlign: 'center', marginTop: 8 }}>
                반복 횟수를 입력해 주세요.
              </Text>
            ) : null}
          </div>
        </div>
      )}

      {/* Rest Timer Overlay (SC-005) — 다크 풀스크린 */}
      {rest ? (
        <div className={styles.restOverlay}>
          <Text variant="headline" as="p" className={styles.restDone}>
            세트 완료! 👏
          </Text>
          <Text variant="body-large" className={styles.restLabel}>
            휴식 시간
          </Text>
          <CircularProgress
            value={((rest.total - rest.remaining) / rest.total) * 100}
            emphasized={rest.remaining <= 10}
            size={240}
            label="남은 휴식 시간"
          >
            <div>
              <Text variant="display" as="p" className={styles.restTime}>
                {formatClock(rest.remaining)}
              </Text>
            </div>
          </CircularProgress>
          <Text variant="body-large" className={styles.restNext}>
            다음 세트를 준비하세요!
          </Text>
          <div className={styles.restActions}>
            <Button
              variant="outlined"
              onClick={() => setRest((r) => (r ? { ...r, remaining: Math.max(0, r.remaining - 15) } : r))}
            >
              -15초
            </Button>
            <Button
              variant="outlined"
              onClick={() => setRest((r) => (r ? { ...r, remaining: r.remaining + 15, total: r.total + 15 } : r))}
            >
              +15초
            </Button>
          </div>
          <Button variant="text" onClick={() => setRest(null)} className={styles.restSkip}>
            휴식 건너뛰기
          </Button>
        </div>
      ) : null}

      <Dialog
        open={exitOpen}
        title="운동을 종료할까요?"
        description={
          progress.completedSets > 0
            ? '지금까지 완료한 세트는 기록으로 저장됩니다.'
            : '완료한 세트가 없어 기록이 저장되지 않습니다.'
        }
        confirmLabel="종료"
        cancelLabel="계속"
        destructive
        onConfirm={handleExit}
        onCancel={() => setExitOpen(false)}
      />
    </div>
  );
}
