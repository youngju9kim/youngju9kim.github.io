/**
 * RoutineCreatePage — FR-003 루틴 생성 (UF-001 Create First Routine).
 * 운동 목적/시간/빈도를 선택하면 머신 중심 루틴을 자동 생성한다(BR-001/002/003).
 * 생성 후 편집 화면으로 이동해 검토·수정할 수 있다(FR-004).
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TopAppBar, Card, Text, Button } from '@components';
import {
  routineGenerator,
  GOAL_LABELS,
  type WorkoutGoal,
} from '@services/routineGenerator';
import { routineRepository } from '@repositories/routineRepository';
import styles from './RoutineForm.module.css';

const GOALS: WorkoutGoal[] = ['full-body', 'upper', 'lower'];
const TIMES = [20, 30, 40];
const FREQS = [2, 3, 4];

export function RoutineCreatePage() {
  const navigate = useNavigate();
  const [goal, setGoal] = useState<WorkoutGoal>('full-body');
  const [minutes, setMinutes] = useState(30);
  const [freq, setFreq] = useState(3);

  const create = () => {
    const routine = routineGenerator.generate({
      goal,
      targetMinutes: minutes,
      frequencyPerWeek: freq,
    });
    routineRepository.save(routine);
    navigate(`/routines/${routine.id}/edit`, { replace: true });
  };

  return (
    <>
      <TopAppBar title="루틴 만들기" onBack={() => navigate(-1)} />
      <div className={styles.page}>
        <Card>
          <Text variant="title" as="h2">
            운동 목적
          </Text>
          <div className={styles.options}>
            {GOALS.map((g) => (
              <Button
                key={g}
                variant={goal === g ? 'filled' : 'outlined'}
                onClick={() => setGoal(g)}
                aria-pressed={goal === g}
              >
                {GOAL_LABELS[g]}
              </Button>
            ))}
          </div>
        </Card>

        <Card>
          <Text variant="title" as="h2">
            운동 시간
          </Text>
          <div className={styles.options}>
            {TIMES.map((t) => (
              <Button
                key={t}
                variant={minutes === t ? 'filled' : 'outlined'}
                onClick={() => setMinutes(t)}
                aria-pressed={minutes === t}
              >
                {t}분
              </Button>
            ))}
          </div>
        </Card>

        <Card>
          <Text variant="title" as="h2">
            주간 운동 빈도
          </Text>
          <div className={styles.options}>
            {FREQS.map((f) => (
              <Button
                key={f}
                variant={freq === f ? 'filled' : 'outlined'}
                onClick={() => setFreq(f)}
                aria-pressed={freq === f}
              >
                주 {f}회
              </Button>
            ))}
          </div>
        </Card>

        <Button fullWidth cta leftIcon="plus" onClick={create}>
          루틴 만들기
        </Button>
      </div>
    </>
  );
}
