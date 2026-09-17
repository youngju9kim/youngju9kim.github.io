/**
 * WorkoutSummaryPage — SC-006 Workout Summary (FR-010/013/014).
 * 성취감 제공 + 다음 운동 동기 강화. 총 시간/볼륨/PR/통계 표시.
 */
import { useNavigate, useParams } from 'react-router-dom';
import { Text, Button, Card, Icon, Badge } from '@components';
import { workoutRepository } from '@repositories/workoutRepository';
import { routineRepository } from '@repositories/routineRepository';
import { workoutService } from '@services/workoutService';
import { statisticsService } from '@services/statisticsService';
import { exerciseRepository } from '@repositories/exerciseRepository';
import { formatDuration } from '@utils/datetime';
import { formatVolume, currentUnit } from '@utils/format';
import styles from './Summary.module.css';

const PR_TYPE_LABEL = {
  weight: '최고 중량',
  reps: '최고 반복',
  volume: '최고 볼륨',
} as const;

export function WorkoutSummaryPage() {
  const navigate = useNavigate();
  const { recordId } = useParams<{ recordId: string }>();
  const record = recordId ? workoutRepository.getRecordById(recordId) : undefined;
  const stats = statisticsService.getStatistics();

  if (!record) {
    return (
      <div className={styles.page}>
        <Text variant="title" as="h1">
          기록을 찾을 수 없습니다.
        </Text>
        <Button cta fullWidth onClick={() => navigate('/', { replace: true })}>
          홈으로
        </Button>
      </div>
    );
  }

  const { summary } = record;

  const repeat = () => {
    const routine = routineRepository.getById(record.routineId);
    if (!routine) {
      navigate('/', { replace: true });
      return;
    }
    workoutService.startSession(routine);
    navigate('/workout', { replace: true });
  };

  return (
    <div className={styles.page}>
      {/* Success Header */}
      <div className={styles.success}>
        <div className={styles.checkCircle}>
          <Icon name="check" size="xl" label="완료" />
        </div>
        <Text variant="display" as="h1" style={{ marginTop: 8 }}>
          오늘 운동 완료!
        </Text>
        <Text variant="body-large" color="secondary">
          오늘도 수고하셨어요 💪 내일도 함께해요.
        </Text>
      </div>

      {/* Summary */}
      <Card>
        <Text variant="title" as="h2">
          오늘의 운동
        </Text>
        <div className={styles.grid}>
          <SummaryStat label="시간" value={formatDuration(summary.totalDurationSec)} />
          <SummaryStat label="운동" value={`${summary.totalExercises}개`} />
          <SummaryStat label="세트" value={`${summary.totalSets}`} />
          <SummaryStat label="반복" value={`${summary.totalReps}`} />
          <SummaryStat label="총 볼륨" value={formatVolume(summary.totalVolume)} />
        </div>
      </Card>

      {/* Personal Records (있을 때만) */}
      {summary.newRecords.length > 0 ? (
        <Card>
          <div className={styles.prHeader}>
            <Icon name="trophy" size="m" />
            <Text variant="title" as="h2">
              새로운 최고 기록!
            </Text>
          </div>
          <div className={styles.prList}>
            {summary.newRecords.map((pr, i) => {
              const ex = exerciseRepository.getById(pr.exerciseId);
              return (
                <div key={i} className={styles.prRow}>
                  <Text variant="body">{ex?.displayName ?? pr.exerciseId}</Text>
                  <Badge tone="pr" icon="trophy">
                    {PR_TYPE_LABEL[pr.type]} {pr.value.toLocaleString()}
                    {pr.type === 'reps' ? '회' : pr.type === 'weight' ? currentUnit() : ''}
                  </Badge>
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}

      {/* Statistics */}
      <Card>
        <Text variant="title" as="h2">
          통계
        </Text>
        <div className={styles.grid}>
          <SummaryStat label="연속 운동일" value={`${stats.streakDays}일`} />
          <SummaryStat label="이번 주" value={`${stats.weeklyWorkouts}회`} />
          <SummaryStat label="총 운동" value={`${stats.totalWorkouts}회`} />
        </div>
      </Card>

      {/* Actions */}
      <div className={styles.actions}>
        <Button fullWidth cta leftIcon="home" onClick={() => navigate('/', { replace: true })}>
          홈으로
        </Button>
        <Button variant="outlined" fullWidth onClick={() => navigate('/history', { replace: true })}>
          기록 보기
        </Button>
        <Button variant="text" fullWidth leftIcon="play" onClick={repeat}>
          같은 루틴 다시 하기
        </Button>
      </div>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.stat}>
      <Text variant="caption" color="secondary">
        {label}
      </Text>
      <Text variant="title" as="p">
        {value}
      </Text>
    </div>
  );
}
