/**
 * RoutineCreatePage — FR-003 루틴 생성 / 재생성 (UF-001 Create First Routine).
 *
 * 장소/목적/시간/빈도를 고르면 루틴을 만들어 **먼저 보여준다**.
 * 마음에 들 때까지 '다시 뽑기' 를 누를 수 있고, 저장은 사용자가 확정할 때만 한다.
 * (예전에는 만들자마자 저장돼서, 마음에 안 들면 지우는 수밖에 없었다)
 *
 * URL 에 :id 가 있으면(`/routines/:id/regenerate`) **이미 등록된 루틴을 다시 만드는** 모드다.
 * 그 루틴의 생성 조건을 미리 채워 두고, 저장하면 같은 id 로 덮어쓴다.
 * id 를 유지하므로 즐겨찾기·기록 연결이 끊기지 않는다.
 */
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { TopAppBar, Card, Text, Button, ListItem, useSnackbar } from '@components';
import {
  routineGenerator,
  availableGoals,
  GOAL_LABELS,
  EQUIPMENT_LABELS,
  type WorkoutGoal,
  type Equipment,
} from '@services/routineGenerator';
import { routineRepository } from '@repositories/routineRepository';
import { exerciseRepository } from '@repositories/exerciseRepository';
import { ExerciseIllustration } from '@features/exercise/ExerciseIllustration';
import { CATEGORY_LABELS } from '@constants/labels';
import { formatReps } from '@utils/format';
import type { Routine } from '@models/routine';
import styles from './RoutineForm.module.css';

const EQUIPMENTS: Equipment[] = ['gym', 'home'];
const TIMES = [20, 30, 40];
const FREQS = [2, 3, 4];

export function RoutineCreatePage() {
  const navigate = useNavigate();
  const snackbar = useSnackbar();

  /** :id 가 있으면 기존 루틴을 다시 만드는 모드 */
  const { id } = useParams<{ id: string }>();
  const [existing] = useState(() => (id ? routineRepository.getById(id) : undefined));
  const isRegenerate = existing !== undefined;
  // 예전에 만든 루틴에는 생성 조건이 없을 수 있다 → 기본값으로 시작한다.
  const prior = existing?.recipe;

  const [equipment, setEquipment] = useState<Equipment>(prior?.equipment ?? 'gym');
  const [goal, setGoal] = useState<WorkoutGoal>(prior?.goal ?? 'full-body');
  const [minutes, setMinutes] = useState(prior?.targetMinutes ?? 30);
  const [freq, setFreq] = useState(prior?.frequencyPerWeek ?? 3);

  /** 아직 저장하지 않은 미리보기 루틴 */
  const [preview, setPreview] = useState<Routine | null>(null);

  const goals = availableGoals(equipment);

  const changeEquipment = (next: Equipment) => {
    setEquipment(next);
    // 집에는 '상체 중심' 이 없다 — 못 고르는 목적이 남지 않게 보정한다.
    if (!availableGoals(next).includes(goal)) setGoal('full-body');
    setPreview(null);
  };

  const build = (avoid: string[] = []) =>
    routineGenerator.generate({
      goal,
      equipment,
      targetMinutes: minutes,
      frequencyPerWeek: freq,
      avoidExerciseIds: avoid,
    });

  /** 다시 만들기라면 지금 들어 있는 운동부터 피해서 뽑는다. */
  const create = () =>
    setPreview(build(existing?.exercises.map((e) => e.exerciseId) ?? []));

  const reroll = () => {
    const previousIds = preview?.exercises.map((e) => e.exerciseId) ?? [];
    setPreview(build(previousIds));
  };

  const save = () => {
    if (!preview) return;

    // 다시 만들기: 같은 id 로 덮어쓴다. 이름은 사용자가 바꿨을 수 있어 그대로 둔다.
    const routine: Routine = existing
      ? {
          ...preview,
          id: existing.id,
          name: existing.name,
          createdAt: existing.createdAt,
          updatedAt: new Date().toISOString(),
        }
      : preview;

    routineRepository.save(routine);
    snackbar.show(
      existing ? '루틴을 새로 구성했습니다.' : '루틴을 저장했습니다.',
      { tone: 'success', icon: 'success' },
    );
    navigate(`/routines/${routine.id}/edit`, { replace: true });
  };

  /* ── 미리보기 단계 ─────────────────────────────────── */
  if (preview) {
    return (
      <>
        <TopAppBar title="이 루틴 어떠세요?" onBack={() => setPreview(null)} />
        <div className={styles.page}>
          <Card>
            <Text variant="title" as="h2">{existing?.name ?? preview.name}</Text>
            <Text variant="body-small" color="secondary" style={{ marginTop: 4 }}>
              운동 {preview.exercises.length}개 · 약 {preview.estimatedDurationMin}분
            </Text>
            {isRegenerate ? (
              <Text variant="body-small" color="secondary" style={{ marginTop: 8 }}>
                저장하면 기존 <b>{existing?.name}</b> 의 운동 구성이 이걸로 바뀝니다.
                지난 운동 기록은 그대로 남습니다.
              </Text>
            ) : null}
          </Card>

          {preview.exercises.length === 0 ? (
            <Card>
              <Text variant="body" color="secondary">
                조건에 맞는 운동을 찾지 못했습니다. 장소나 목적을 바꿔 보세요.
              </Text>
            </Card>
          ) : (
            <Card>
              {preview.exercises.map((re, i) => {
                const ex = exerciseRepository.getById(re.exerciseId);
                if (!ex) return null;
                return (
                  <ListItem
                    key={re.exerciseId}
                    title={`${i + 1}. ${ex.displayName}`}
                    subtitle={`${CATEGORY_LABELS[ex.category]} · ${re.sets}세트 × ${formatReps(re.targetReps)}`}
                    leading={<ExerciseIllustration exercise={ex} size={48} />}
                  />
                );
              })}
            </Card>
          )}

          <Text variant="body-small" color="secondary" style={{ textAlign: 'center' }}>
            마음에 들지 않으면 다시 뽑아 보세요. 저장 후에도 얼마든지 고칠 수 있습니다.
          </Text>

          <div className={styles.previewActions}>
            <Button variant="outlined" fullWidth leftIcon="timer" onClick={reroll}>
              다시 뽑기
            </Button>
            <Button
              fullWidth
              cta
              leftIcon="check"
              onClick={save}
              disabled={preview.exercises.length === 0}
            >
              {isRegenerate ? '이걸로 바꾸기' : '이걸로 저장'}
            </Button>
          </div>
        </div>
      </>
    );
  }

  /* ── 조건 선택 단계 ────────────────────────────────── */
  return (
    <>
      <TopAppBar
        title={isRegenerate ? '루틴 다시 만들기' : '루틴 만들기'}
        onBack={() => navigate(-1)}
      />
      <div className={styles.page}>
        <Card>
          <Text variant="title" as="h2">운동 장소</Text>
          <div className={styles.options}>
            {EQUIPMENTS.map((e) => (
              <Button
                key={e}
                variant={equipment === e ? 'filled' : 'outlined'}
                onClick={() => changeEquipment(e)}
                aria-pressed={equipment === e}
              >
                {EQUIPMENT_LABELS[e]}
              </Button>
            ))}
          </div>
          {equipment === 'home' ? (
            <Text variant="body-small" color="secondary" style={{ marginTop: 12 }}>
              기구 없이 할 수 있는 맨몸 운동으로만 구성합니다.
              맨몸 운동에는 등·어깨 운동이 없어 상체 중심은 만들 수 없습니다.
            </Text>
          ) : null}
        </Card>

        <Card>
          <Text variant="title" as="h2">운동 목적</Text>
          <div className={styles.options}>
            {goals.map((g) => (
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
          <Text variant="title" as="h2">운동 시간</Text>
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
          <Text variant="title" as="h2">주간 운동 빈도</Text>
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

        <Button
          fullWidth
          cta
          leftIcon={isRegenerate ? 'shuffle' : 'plus'}
          onClick={create}
        >
          {isRegenerate ? '다시 뽑기' : '루틴 만들기'}
        </Button>
      </div>
    </>
  );
}
