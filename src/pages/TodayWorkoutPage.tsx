/**
 * TodayWorkoutPage — 오늘 운동 목록 (목업 screen 2).
 * 시작 전 오늘 루틴의 운동을 썸네일과 함께 미리 보고, 하단 CTA 로 세션을 시작한다(FR-005).
 */
import { useNavigate, useParams } from 'react-router-dom';
import { TopAppBar, Card, Text, Button, ListItem } from '@components';
import { ExerciseIllustration } from '@features/exercise/ExerciseIllustration';
import { routineRepository } from '@repositories/routineRepository';
import { exerciseRepository } from '@repositories/exerciseRepository';
import { workoutService } from '@services/workoutService';
import { CATEGORY_LABELS } from '@constants/labels';
import { formatReps } from '@utils/format';
import styles from './TodayWorkout.module.css';

export function TodayWorkoutPage() {
  const navigate = useNavigate();
  const { routineId } = useParams<{ routineId: string }>();
  const routine = routineId ? routineRepository.getById(routineId) : undefined;

  if (!routine) {
    return (
      <>
        <TopAppBar title="오늘 운동" onBack={() => navigate('/')} />
        <div className={styles.page}>
          <Text variant="body" color="secondary">
            루틴을 찾을 수 없습니다.
          </Text>
        </div>
      </>
    );
  }

  const begin = () => {
    workoutService.startSession(routine);
    navigate('/workout', { replace: true });
  };

  return (
    <>
      <TopAppBar title="오늘 운동" onBack={() => navigate('/')} />
      <div className={styles.page}>
        <Text variant="body" color="secondary">
          총 {routine.exercises.length}개 · 약 {routine.estimatedDurationMin}분
        </Text>

        <Card>
          {routine.exercises.map((re, i) => {
            const ex = exerciseRepository.getById(re.exerciseId);
            if (!ex) return null;
            return (
              <ListItem
                key={re.exerciseId}
                leading={<ExerciseIllustration exercise={ex} size={48} />}
                title={`${i + 1}. ${ex.displayName}`}
                subtitle={`${CATEGORY_LABELS[ex.category]} · ${re.sets}세트 × ${formatReps(re.targetReps)}`}
              />
            );
          })}
        </Card>

        <div className={styles.footer}>
          <Button fullWidth cta leftIcon="play" onClick={begin}>
            운동 시작
          </Button>
        </div>
      </div>
    </>
  );
}
