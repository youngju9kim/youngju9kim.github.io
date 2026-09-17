/**
 * RoutineEditorPage — SC-003 Routine Editor (FR-004).
 * 운동 추가/삭제/순서변경/세트·반복·휴식 수정. 변경 즉시 자동 저장 + 예상 시간 재계산.
 * 접근성: 순서 변경은 드래그 대신 위/아래 버튼 제공(INT-004).
 */
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  TopAppBar,
  Card,
  Text,
  Input,
  Stepper,
  IconButton,
  Button,
  BottomSheet,
  ListItem,
  Icon,
  Chip,
  useSnackbar,
} from '@components';
import { routineRepository } from '@repositories/routineRepository';
import { routineGenerator } from '@services/routineGenerator';
import { exerciseRepository } from '@repositories/exerciseRepository';
import { CATEGORY_LABELS } from '@constants/labels';
import type { Routine, RoutineExercise } from '@models/routine';
import type { Exercise } from '@models/exercise';
import styles from './RoutineEditor.module.css';

export function RoutineEditorPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const snackbar = useSnackbar();
  const [routine, setRoutine] = useState<Routine | undefined>(() =>
    id ? routineRepository.getById(id) : undefined,
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState('');

  const searchResults = useMemo<Exercise[]>(
    () => exerciseRepository.search(query),
    [query],
  );

  if (!routine) {
    return (
      <>
        <TopAppBar title="루틴 편집" onBack={() => navigate('/routines')} />
        <div className={styles.page}>
          <Text variant="body" color="secondary">
            루틴을 찾을 수 없습니다.
          </Text>
        </div>
      </>
    );
  }

  /** 변경을 반영하고 즉시 저장(FR-004) + 예상 시간 재계산 */
  const persist = (exercises: RoutineExercise[], name = routine.name) => {
    const reordered = exercises.map((e, i) => ({ ...e, order: i }));
    const next: Routine = {
      ...routine,
      name,
      exercises: reordered,
      estimatedDurationMin: routineGenerator.estimateRoutineMinutes(reordered),
      source: 'custom',
    };
    setRoutine(next);
    routineRepository.save(next);
  };

  const updateExercise = (index: number, patch: Partial<RoutineExercise>) => {
    const next = routine.exercises.map((e, i) =>
      i === index ? { ...e, ...patch } : e,
    );
    persist(next);
  };

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= routine.exercises.length) return;
    const next = routine.exercises.slice();
    [next[index], next[target]] = [next[target], next[index]];
    persist(next);
  };

  const remove = (index: number) => {
    persist(routine.exercises.filter((_, i) => i !== index));
    snackbar.show('운동을 삭제했습니다.');
  };

  const addExercise = (ex: Exercise) => {
    if (routine.exercises.some((e) => e.exerciseId === ex.id)) {
      snackbar.show('이미 추가된 운동입니다.');
      return;
    }
    const newItem: RoutineExercise = {
      exerciseId: ex.id,
      order: routine.exercises.length,
      sets: ex.recommendedSets,
      targetReps: ex.recommendedReps,
      restSec: ex.recommendedRestSec,
    };
    persist([...routine.exercises, newItem]);
    setPickerOpen(false);
    setQuery('');
    snackbar.show('운동을 추가했습니다.', { tone: 'success', icon: 'success' });
  };

  return (
    <>
      <TopAppBar
        title="루틴 편집"
        onBack={() => navigate('/routines')}
        actions={
          <Button variant="text" onClick={() => navigate('/routines')}>
            완료
          </Button>
        }
      />
      <div className={styles.page}>
        <Card>
          <Input
            label="루틴 이름"
            value={routine.name}
            onChange={(e) => persist(routine.exercises, e.target.value)}
          />
          <Text variant="body-small" color="secondary" style={{ marginTop: 12 }}>
            운동 {routine.exercises.length}개 · 약 {routine.estimatedDurationMin}분
            · 변경 시 자동 저장됩니다.
          </Text>
        </Card>

        {routine.exercises.map((re, index) => {
          const ex = exerciseRepository.getById(re.exerciseId);
          if (!ex) return null;
          return (
            <Card key={re.exerciseId}>
              <div className={styles.exHeader}>
                <div className={styles.exTitle}>
                  <Text variant="title" as="h3">
                    {index + 1}. {ex.displayName}
                  </Text>
                  <Chip variant="outlined">{CATEGORY_LABELS[ex.category]}</Chip>
                </div>
                <div className={styles.exMenu}>
                  <IconButton
                    icon="chevron-left"
                    label="위로 이동"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    style={{ transform: 'rotate(90deg)' }}
                  />
                  <IconButton
                    icon="chevron-right"
                    label="아래로 이동"
                    onClick={() => move(index, 1)}
                    disabled={index === routine.exercises.length - 1}
                    style={{ transform: 'rotate(90deg)' }}
                  />
                  <IconButton
                    icon="delete"
                    label="운동 삭제"
                    tone="danger"
                    onClick={() => remove(index)}
                  />
                </div>
              </div>
              <div className={styles.controls}>
                <Stepper
                  label="세트"
                  value={re.sets}
                  min={1}
                  max={10}
                  onChange={(v) => updateExercise(index, { sets: v })}
                />
                <Stepper
                  label="휴식(초)"
                  value={re.restSec}
                  min={0}
                  max={300}
                  step={15}
                  unit="초"
                  onChange={(v) => updateExercise(index, { restSec: v })}
                />
              </div>
              <div className={styles.controls}>
                <Stepper
                  label="최소 반복"
                  value={re.targetReps.min}
                  min={1}
                  max={re.targetReps.max}
                  onChange={(v) =>
                    updateExercise(index, {
                      targetReps: { ...re.targetReps, min: v },
                    })
                  }
                />
                <Stepper
                  label="최대 반복"
                  value={re.targetReps.max}
                  min={re.targetReps.min}
                  max={30}
                  onChange={(v) =>
                    updateExercise(index, {
                      targetReps: { ...re.targetReps, max: v },
                    })
                  }
                />
              </div>
            </Card>
          );
        })}

        <Button
          variant="outlined"
          fullWidth
          leftIcon="plus"
          onClick={() => setPickerOpen(true)}
        >
          운동 추가
        </Button>
      </div>

      <BottomSheet
        open={pickerOpen}
        title="운동 추가"
        expanded
        onClose={() => {
          setPickerOpen(false);
          setQuery('');
        }}
      >
        <Input
          label="운동 검색"
          placeholder="운동 이름 또는 부위"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className={styles.pickerList}>
          {searchResults.map((ex) => (
            <ListItem
              key={ex.id}
              title={ex.displayName}
              subtitle={`${CATEGORY_LABELS[ex.category]} · ${ex.englishName}`}
              leading={<Icon name="plus" />}
              onClick={() => addExercise(ex)}
            />
          ))}
          {searchResults.length === 0 ? (
            <Text variant="body" color="secondary" style={{ padding: '16px 0' }}>
              검색 결과가 없습니다.
            </Text>
          ) : null}
        </div>
      </BottomSheet>
    </>
  );
}
