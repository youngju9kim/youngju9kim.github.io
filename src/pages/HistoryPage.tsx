/**
 * HistoryPage — SC-007 History. 완료된 운동 기록 조회 (FR-011).
 * 최근 순 목록, 카드 선택 시 상세(SC-008)로 이동.
 */
import { useNavigate } from 'react-router-dom';
import { TopAppBar, Card, Text, EmptyState, Icon, Badge } from '@components';
import { workoutRepository } from '@repositories/workoutRepository';
import { formatDuration, formatDateKorean } from '@utils/datetime';
import { formatVolume } from '@utils/format';
import styles from './History.module.css';

export function HistoryPage() {
  const navigate = useNavigate();
  const history = workoutRepository.getHistory();

  return (
    <>
      <TopAppBar title="운동 기록" />
      <div className={styles.page}>
        {history.length === 0 ? (
          <EmptyState
            illustration={<Icon name="history" size="xl" />}
            title="아직 운동 기록이 없습니다"
            description="운동을 완료하면 여기에서 기록을 확인할 수 있어요."
          />
        ) : (
          <div className={styles.list}>
            {history.map((rec) => (
              <Card
                key={rec.id}
                interactive
                onClick={() => navigate(`/history/${rec.id}`)}
                aria-label={`${formatDateKorean(rec.performedAt)} ${rec.routineName} 기록 보기`}
              >
                <div className={styles.rowTop}>
                  <Text variant="caption" color="secondary">
                    {formatDateKorean(rec.performedAt)}
                  </Text>
                  {rec.summary.newRecords.length > 0 ? (
                    <Badge tone="pr" icon="trophy">
                      PR {rec.summary.newRecords.length}
                    </Badge>
                  ) : null}
                </div>
                <Text variant="title" as="h2" style={{ marginTop: 4 }}>
                  {rec.routineName}
                </Text>
                <Text variant="body-small" color="secondary" style={{ marginTop: 4 }}>
                  {formatDuration(rec.durationSec)} · {rec.summary.totalSets}세트 ·
                  총 볼륨 {formatVolume(rec.summary.totalVolume)}
                </Text>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
