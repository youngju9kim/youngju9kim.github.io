/**
 * WorkoutSessionPage — SC-004 Workout Session + SC-005 Rest Timer.
 *
 * 세트를 자동으로 진행한다(2026-09-30 개편). 예전에는 '세트 시작하기' → 다른 화면 →
 * 횟수 직접 입력 → '세트 완료' 를 손으로 눌러야 해서 운동 중에 번거로웠다.
 *
 * 지금 흐름: 자세 사진 화면을 그대로 둔 채, 버튼 자리에서 카운트가 자동으로 올라간다.
 *   세트 시작 → "자세를 준비하세요" → 호령/초 카운트 → "세트 완료"
 *   → 휴식 → (자동) 다음 세트 → 마지막 세트면 다음 운동 가이드로
 *
 * 운동이 바뀔 때는 자동 진행하지 않는다 — 기구로 이동하고 중량을 맞출 시간이 필요하다.
 * FR-005~009.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Text,
  Button,
  IconButton,
  Card,
  Stepper,
  LinearProgress,
  CircularProgress,
  Dialog,
} from '@components';
import { ExerciseVideo } from '@features/exercise/ExerciseVideo';
import { getGuideSteps } from '@features/exercise/exerciseGuide';
import { usesWeight, isAssistMachine } from '@services/weightRecommender';
import { workoutRepository } from '@repositories/workoutRepository';
import { exerciseRepository } from '@repositories/exerciseRepository';
import { settingsRepository } from '@repositories/settingsRepository';
import { workoutService } from '@services/workoutService';
import { speech } from '@services/speech';
import { useSetRunner } from '@hooks/useSetRunner';
import { useWakeLock } from '@hooks/useWakeLock';
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
  const [rest, setRest] = useState<{ remaining: number; total: number } | null>(null);
  const [exitOpen, setExitOpen] = useState(false);
  const [guideStep, setGuideStep] = useState(0);
  const [voice, setVoice] = useState(() => settingsRepository.getVoiceEnabled());
  const pace = useMemo(() => settingsRepository.getPace(), []);

  /** 휴식이 끝나면 다음 세트를 자동으로 시작할지 — 운동이 바뀌면 false */
  const autoStartNext = useRef(false);

  const cursor = useMemo(() => (session ? findCursor(session) : null), [session]);

  // 운동 중에는 화면이 꺼지면 안 된다(카운트를 보고 따라 하는 중).
  useWakeLock(session !== null);

  useEffect(() => {
    if (!session) navigate('/', { replace: true });
  }, [session, navigate]);

  const exIndex = cursor?.exerciseIndex ?? 0;
  const sessionExercise = session?.exercises[exIndex];
  const exercise = sessionExercise
    ? exerciseRepository.getById(sessionExercise.exerciseId)
    : undefined;

  // 커서 이동 시 중량 기본값 반영
  useEffect(() => {
    if (!session || !cursor) return;
    const set = session.exercises[cursor.exerciseIndex].sets.find(
      (s) => s.setNumber === cursor.setNumber,
    );
    if (set) setWeight(set.weight);
  }, [session, cursor]);

  /** 세트 한 개를 기록하고 다음 상태로 넘긴다 */
  const completeSet = useCallback(
    (achieved: number) => {
      if (!session || !cursor || !sessionExercise) return;
      const updated = workoutService.completeSet(
        session,
        cursor.exerciseIndex,
        cursor.setNumber,
        weight,
        achieved,
      );
      const nextCursor = findCursor(updated);

      if (!nextCursor) {
        const result = workoutService.finalize(updated);
        if (result) navigate(`/workout/summary/${result.record.id}`, { replace: true });
        else setSession(updated);
        return;
      }

      setSession(updated);
      const sameExercise = nextCursor.exerciseIndex === cursor.exerciseIndex;
      if (!sameExercise) {
        workoutService.setCurrentExercise(updated, nextCursor.exerciseIndex);
        setGuideStep(0);
      }
      // 같은 운동의 다음 세트만 자동으로 이어 간다.
      autoStartNext.current = sameExercise;

      if (sessionExercise.restSec > 0) {
        setRest({ remaining: sessionExercise.restSec, total: sessionExercise.restSec });
      }
    },
    [session, cursor, sessionExercise, weight, navigate],
  );

  const runner = useSetRunner({
    unit: exercise?.repUnit ?? 'reps',
    target: sessionExercise?.targetReps.max ?? 0,
    prepSec: pace.prepSec,
    repTempoSec: pace.repTempoSec,
    voice,
    onComplete: completeSet,
  });

  const running = runner.phase === 'prepare' || runner.phase === 'active';

  // 자세 가이드 자막 자동 순환(1.6초). 세트를 진행하는 동안은 멈춘다.
  useEffect(() => {
    if (!exercise || running) return;
    const n = getGuideSteps(exercise).length;
    if (n <= 1) return;
    const t = setInterval(() => setGuideStep((s) => (s + 1) % n), 1600);
    return () => clearInterval(t);
  }, [exercise, running]);

  // 반복 운동은 호령에 맞춰 '동작 ↔ 복귀' 사진을 번갈아 보여 준다.
  useEffect(() => {
    if (runner.phase !== 'active' || !exercise) return;
    const n = getGuideSteps(exercise).length;
    if (n < 2) return;
    setGuideStep(exercise.repUnit === 'seconds' ? 1 : runner.count % 2 === 1 ? 1 : Math.min(2, n - 1));
  }, [runner.phase, runner.count, exercise]);

  // 휴식 카운트다운 (FR-008)
  useEffect(() => {
    if (!rest) return;
    if (rest.remaining <= 0) {
      setRest(null);
      // 같은 운동의 다음 세트면 바로 이어서 시작한다.
      if (autoStartNext.current) {
        autoStartNext.current = false;
        runner.start();
      }
      return;
    }
    const t = setTimeout(
      () => setRest((r) => (r ? { ...r, remaining: r.remaining - 1 } : r)),
      1000,
    );
    return () => clearTimeout(t);
  }, [rest, runner]);

  if (!session || !cursor || !sessionExercise || !exercise) return null;

  const unit = currentUnit();
  const weightIsSuggested = !workoutService.hasPreviousPerformance(exercise.id);
  const progress = workoutService.getProgress(session);
  const totalExercises = session.exercises.length;
  const guideSteps = getGuideSteps(exercise);
  const isHold = exercise.repUnit === 'seconds';
  const target = sessionExercise.targetReps.max;

  const toggleVoice = () => {
    const next = !voice;
    setVoice(next);
    settingsRepository.setVoiceEnabled(next);
    if (!next) speech.cancel();
  };

  const handleExit = () => {
    setExitOpen(false);
    runner.stop();
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

  /** 목표를 다 못 채우고 지금까지 한 만큼만 기록 */
  const stopEarly = () => {
    const achieved = runner.count;
    runner.stop();
    if (achieved > 0) completeSet(achieved);
  };

  return (
    <div className={styles.session}>
      <header className={styles.header}>
        <div>
          <Text variant="title" as="h1">
            {exercise.displayName}
          </Text>
          <Text variant="body-small" color="secondary">
            {sessionExercise.targetSets}세트 ×{' '}
            {formatReps(sessionExercise.targetReps, exercise.repUnit)}
          </Text>
        </div>
        <div className={styles.headerActions}>
          <IconButton
            icon={voice ? 'volume-on' : 'volume-off'}
            label={voice ? '음성 안내 끄기' : '음성 안내 켜기'}
            onClick={toggleVoice}
            aria-pressed={voice}
          />
          <IconButton icon="stop" label="운동 종료" tone="danger" onClick={() => setExitOpen(true)} />
        </div>
      </header>

      <LinearProgress
        value={progress.percent}
        label={`운동 ${exIndex + 1} / ${totalExercises}`}
      />

      {/* 자세 사진 — 세트를 진행하는 동안에도 그대로 둔다 */}
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

        {/* 버튼 자리 — 시작 전에는 버튼, 진행 중에는 카운트 */}
        <div className={styles.guideFooter}>
          <Text variant="label" color="success" className={styles.setLabel}>
            세트 {cursor.setNumber} / {sessionExercise.targetSets}
          </Text>

          {runner.phase === 'idle' ? (
            <>
              {usesWeight(exercise) ? (
                <div className={styles.weightRow}>
                  <Stepper
                    label={isAssistMachine(exercise.id) ? '보조 중량' : '중량'}
                    value={weight}
                    min={0}
                    max={500}
                    step={2.5}
                    allowDecimal
                    unit={unit}
                    onChange={setWeight}
                  />
                  <Text variant="caption" color="secondary" className={styles.weightHint}>
                    {weightIsSuggested
                      ? '처음 하는 운동이라 추천값을 넣어 뒀어요.'
                      : '지난번에 사용한 중량입니다.'}
                  </Text>
                </div>
              ) : null}

              {exercise.formCues.length > 0 ? (
                <Card className={styles.tip}>
                  <Text variant="body-small" color="secondary">
                    💡 TIP · {exercise.formCues[0]}
                  </Text>
                </Card>
              ) : null}

              <Button fullWidth cta leftIcon="play" onClick={runner.start}>
                세트 시작하기
              </Button>
            </>
          ) : (
            <div className={styles.runner}>
              {runner.phase === 'prepare' ? (
                <>
                  <Text variant="body-large" color="secondary">자세를 준비하세요</Text>
                  <p className={styles.runnerCount}>{runner.prepRemaining}</p>
                </>
              ) : (
                <>
                  <Text variant="body-large" color="secondary">
                    {isHold ? '버티는 중' : '따라 하세요'}
                  </Text>
                  <p className={styles.runnerCount}>
                    {runner.count}
                    <span className={styles.runnerTarget}>/ {target}{isHold ? '초' : '회'}</span>
                  </p>
                  <LinearProgress value={runner.percent} label="세트 진행률" />
                </>
              )}
              <Button variant="outlined" fullWidth onClick={stopEarly}>
                여기까지만 하기
              </Button>
            </div>
          )}
        </div>
      </div>

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
            {autoStartNext.current
              ? '휴식이 끝나면 다음 세트가 자동으로 시작됩니다'
              : '다음 운동을 준비하세요!'}
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
          <Button
            variant="text"
            onClick={() => setRest((r) => (r ? { ...r, remaining: 0 } : null))}
            className={styles.restSkip}
          >
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
