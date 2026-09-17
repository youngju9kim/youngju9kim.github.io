/**
 * WorkoutDetailPage — SC-008 Workout Detail. 하나의 운동 기록 상세 (FR-011/012).
 * 운동별 세트 기록(중량×반복·볼륨)과 요약을 표시한다.
 */
import { useNavigate, useParams } from 'react-router-dom';
import { TopAppBar, Card, Text, Icon } from '@components';
import { workoutRepository } from '@repositories/workoutRepository';
import { exerciseRepository } from '@repositories/exerciseRepository';
import { formatDuration, formatDateKorean } from '@utils/datetime';
import { formatWeight, formatVolume } from '@utils/format';
import styles from './History.module.css';

export function WorkoutDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const record = id ? workoutRepository.getRecordById(id) : undefined;

  if (!record) {
    return (
      <>
        <TopAppBar title="운동 상세" onBack={() => navigate('/history')} />
        <div className={styles.detailPage}>
          <Text variant="body" color="secondary">
            기록을 찾을 수 없습니다.
          </Text>
        </div>
      </>
    );
  }

  return (
    <>
      <TopAppBar title="운동 상세" onBack={() => navigate('/history')} />
      <div className={styles.detailPage}>
        <div>
          <Text variant="caption" color="secondary">
            {formatDateKorean(record.performedAt)}
          </Text>
          <Text variant="headline" as="h1" style={{ marginTop: 4 }}>
            {record.routineName}
          </Text>
          <Text variant="body" color="secondary" style={{ marginTop: 4 }}>
            {formatDuration(record.durationSec)} · {record.summary.totalSets}세트 ·
            총 볼륨 {formatVolume(record.summary.totalVolume)}
          </Text>
        </div>

        {record.exercises.map((ex) => {
          const info = exerciseRepository.getById(ex.exerciseId);
          return (
            <Card key={ex.exerciseId}>
              <Text variant="title" as="h2" className={styles.exerciseTitle}>
                {info?.displayName ?? ex.exerciseId}
              </Text>
              {ex.sets.map((set) => (
                <div key={set.setNumber} className={styles.setRow}>
                  <Text variant="body" color="secondary">
                    {set.setNumber}세트
                  </Text>
                  <Text variant="body-large">
                    {formatWeight(set.weight)} × {set.reps}회
                  </Text>
                  <Text variant="body-small" color="secondary">
                    {formatVolume(set.volume)}
                  </Text>
                </div>
              ))}
            </Card>
          );
        })}

        {record.summary.newRecords.length > 0 ? (
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-warning)' }}>
              <Icon name="trophy" size="s" />
              <Text variant="label" color="warning">
                이 날 {record.summary.newRecords.length}개의 최고 기록을 세웠어요!
              </Text>
            </div>
          </Card>
        ) : null}
      </div>
    </>
  );
}
