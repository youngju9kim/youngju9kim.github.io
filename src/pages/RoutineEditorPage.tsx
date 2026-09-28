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
  Chip,
  useSnackbar,
} from '@components';
import { routineRepository } from '@repositories/routineRepository';
import { routineGenerator } from '@services/routineGenerator';
import { exerciseRepository } from '@repositories/exerciseRepository';
import { ExerciseIllustration } from '@features/exercise/ExerciseIllustration';
import { CATEGORY_LABELS, MACHINE_LABELS } from '@constants/labels';
import type { Routine, RoutineExercise } from '@models/routine';
import type { Exercise, ExerciseCategory } from '@models/exercise';
import styles from './RoutineEditor.module.css';

/** 필터 버튼의 선택 여부에 따른 클래스 */
function filterClass(on: boolean): string {
  return [styles.filterChip, on && styles.filterChipOn].filter(Boolean).join(' ');
}

/** 운동 고르기 시트의 부위 필터 — 카탈로그에 실제로 있는 6개 부위 */
const PICKER_CATEGORIES: ExerciseCategory[] = [
  'CAT-CHEST',
  'CAT-BACK',
  'CAT-SHOULDER',
  'CAT-ARM',
  'CAT-LEG',
  'CAT-CORE',
];

export function RoutineEditorPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const snackbar = useSnackbar();
  const [routine, setRoutine] = useState<Routine | undefined>(() =>
    id ? routineRepository.getById(id) : undefined,
  );
  /**
   * 운동 고르기 시트.
   *  - mode 'add'     : 목록 끝에 추가
   *  - mode 'replace' : 해당 순서의 운동을 제자리에서 교체(세트·휴식은 유지)
   */
  const [picker, setPicker] = useState<
    { mode: 'add' } | { mode: 'replace'; index: number } | null
  >(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ExerciseCategory | 'all'>('all');
  const [bodyweightOnly, setBodyweightOnly] = useState(false);

  const usedIds = useMemo(
    () => routine?.exercises.map((e) => e.exerciseId) ?? [],
    [routine],
  );

  /** 시트를 열 때의 기본 후보. 교체 모드면 같은 부위부터 보여준다. */
  const pickerResults = useMemo<Exercise[]>(() => {
    if (!picker) return [];
    const base = query.trim()
      ? exerciseRepository.search(query)
      : exerciseRepository.getAll();
    const used = new Set(usedIds);
    const replacingId =
      picker.mode === 'replace' ? routine?.exercises[picker.index]?.exerciseId : undefined;

    return base.filter((ex) => {
      if (ex.id === replacingId) return false; // 자기 자신은 제외
      if (used.has(ex.id)) return false; // 이미 루틴에 있는 운동 제외
      if (category !== 'all' && ex.category !== category) return false;
      if (bodyweightOnly && ex.machineType !== 'MCH-BODYWEIGHT') return false;
      return true;
    });
  }, [picker, query, category, bodyweightOnly, usedIds, routine]);

  const openAdd = () => {
    setPicker({ mode: 'add' });
    setQuery('');
    setCategory('all');
    setBodyweightOnly(false);
  };

  const openReplace = (index: number) => {
    const current = routine?.exercises[index];
    const ex = current ? exerciseRepository.getById(current.exerciseId) : undefined;
    setPicker({ mode: 'replace', index });
    setQuery('');
    // 교체는 같은 부위를 찾는 경우가 대부분이라 미리 걸러 둔다.
    setCategory(ex?.category ?? 'all');
    setBodyweightOnly(ex?.machineType === 'MCH-BODYWEIGHT');
  };

  const closePicker = () => {
    setPicker(null);
    setQuery('');
  };

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

  /** 시트에서 운동을 고르면 추가하거나(add) 제자리 교체(replace)한다. */
  const choose = (ex: Exercise) => {
    if (!picker) return;

    if (picker.mode === 'replace') {
      const current = routine.exercises[picker.index];
      // 세트·휴식은 사용자가 맞춰 둔 값이라 그대로 두고 운동만 바꾼다.
      const next = routine.exercises.map((e, i) =>
        i === picker.index
          ? { ...current, exerciseId: ex.id, targetReps: ex.recommendedReps }
          : e,
      );
      persist(next);
      closePicker();
      snackbar.show(`${ex.displayName} 으로 바꿨습니다.`, { tone: 'success', icon: 'success' });
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
    closePicker();
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
                  <Button variant="text" onClick={() => openReplace(index)}>
                    교체
                  </Button>
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

        <Button variant="outlined" fullWidth leftIcon="plus" onClick={openAdd}>
          운동 추가
        </Button>
      </div>

      <BottomSheet
        open={picker !== null}
        title={picker?.mode === 'replace' ? '다른 운동으로 교체' : '운동 추가'}
        expanded
        onClose={closePicker}
      >
        <Input
          label="운동 검색"
          placeholder="운동 이름"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {/* 부위 필터 — 폰에서는 타이핑보다 눌러서 좁히는 쪽이 빠르다 */}
        <div className={styles.filters} role="group" aria-label="운동 필터">
          <button
            type="button"
            className={filterClass(category === 'all')}
            aria-pressed={category === 'all'}
            onClick={() => setCategory('all')}
          >
            전체
          </button>
          {PICKER_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              className={filterClass(category === c)}
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
            >
              {CATEGORY_LABELS[c]}
            </button>
          ))}
          <button
            type="button"
            className={filterClass(bodyweightOnly)}
            aria-pressed={bodyweightOnly}
            onClick={() => setBodyweightOnly((v) => !v)}
          >
            맨몸만
          </button>
        </div>

        <div className={styles.pickerList}>
          {pickerResults.map((ex) => (
            <ListItem
              key={ex.id}
              title={ex.displayName}
              subtitle={`${CATEGORY_LABELS[ex.category]} · ${MACHINE_LABELS[ex.machineType]}`}
              leading={<ExerciseIllustration exercise={ex} size={44} />}
              onClick={() => choose(ex)}
            />
          ))}
          {pickerResults.length === 0 ? (
            <Text variant="body" color="secondary" style={{ padding: '16px 0' }}>
              조건에 맞는 운동이 없습니다. 필터를 풀어 보세요.
            </Text>
          ) : null}
        </div>
      </BottomSheet>
    </>
  );
}
