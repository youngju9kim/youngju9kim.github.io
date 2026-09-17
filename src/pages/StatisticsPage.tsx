/**
 * StatisticsPage — SC-009 Statistics (FR-014). 장기 운동 통계.
 * 통계 수치 카드 + 최근 운동 볼륨 막대 차트 + 주간 목표 링. 데이터 없으면 Empty State.
 */
import { useNavigate } from 'react-router-dom';
import {
  TopAppBar,
  Card,
  Text,
  EmptyState,
  Icon,
  Button,
  BarChart,
  CircularProgress,
} from '@components';
import { statisticsService } from '@services/statisticsService';
import { workoutRepository } from '@repositories/workoutRepository';
import { formatDuration, dateKey } from '@utils/datetime';
import { formatVolume } from '@utils/format';
import styles from './Statistics.module.css';

const WEEKLY_GOAL = 3; // 주간 운동 목표(기본), 향후 설정화 가능

export function StatisticsPage() {
  const navigate = useNavigate();
  const stats = statisticsService.getStatistics();
  const history = workoutRepository.getHistory();

  if (stats.totalWorkouts === 0) {
    return (
      <>
        <TopAppBar title="통계" />
        <div className={styles.page}>
          <EmptyState
            illustration={<Icon name="statistics" size="xl" />}
            title="운동을 시작하면 통계가 생성됩니다"
            description="누적 운동량과 연속 운동일을 여기에서 볼 수 있어요."
            action={
              <Button cta leftIcon="play" onClick={() => navigate('/')}>
                오늘의 루틴 시작
              </Button>
            }
          />
        </div>
      </>
    );
  }

  // 최근 최대 8개 운동의 볼륨(오래된→최신)
  const recent = history.slice(0, 8).reverse();
  const barData = recent.map((r) => ({
    label: dateKey(r.performedAt).slice(5), // MM-DD
    value: r.summary.totalVolume,
    display: r.summary.totalVolume.toLocaleString(),
  }));

  const weeklyPercent = Math.min(100, (stats.weeklyWorkouts / WEEKLY_GOAL) * 100);

  return (
    <>
      <TopAppBar title="통계" />
      <div className={styles.page}>
        {/* 주간 목표 링 (CHART-003) */}
        <Card>
          <Text variant="title" as="h2">
            이번 주 목표
          </Text>
          <div className={styles.ringWrap}>
            <CircularProgress value={weeklyPercent} size={140} label="주간 운동 목표 달성률">
              <div>
                <Text variant="headline" as="p">
                  {stats.weeklyWorkouts}/{WEEKLY_GOAL}
                </Text>
                <Text variant="caption" color="secondary">
                  회
                </Text>
              </div>
            </CircularProgress>
          </div>
        </Card>

        {/* 누적 통계 카드 */}
        <div className={styles.statGrid}>
          <StatCard label="총 운동" value={`${stats.totalWorkouts}회`} />
          <StatCard label="연속 운동일" value={`${stats.streakDays}일`} />
          <StatCard label="총 시간" value={formatDuration(stats.totalDurationSec)} />
          <StatCard label="총 세트" value={`${stats.totalSets}`} />
          <StatCard label="총 반복" value={`${stats.totalReps}`} />
          <StatCard label="총 볼륨" value={formatVolume(stats.totalVolume)} />
        </div>

        {/* 최근 볼륨 추세 (CHART-002) */}
        {barData.length > 0 ? (
          <Card>
            <Text variant="title" as="h2">
              최근 운동 볼륨
            </Text>
            <BarChart data={barData} ariaLabel="최근 운동별 총 볼륨(kg) 막대 차트" />
          </Card>
        ) : null}
      </div>
    </>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <Text variant="caption" color="secondary">
        {label}
      </Text>
      <Text variant="title" as="p" style={{ marginTop: 4 }}>
        {value}
      </Text>
    </Card>
  );
}
