/**
 * RoutineListPage — SC-002 Routine List. 저장된 루틴 조회·관리 (FR-003/004/016).
 * 카드에서 선택(운동 시작)·편집·삭제. 삭제는 확인 Dialog(STR-003).
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TopAppBar,
  Card,
  Text,
  Button,
  IconButton,
  Fab,
  EmptyState,
  Icon,
  Dialog,
  useSnackbar,
} from '@components';
import { routineRepository } from '@repositories/routineRepository';
import { favoriteRepository } from '@repositories/favoriteRepository';
import { workoutService } from '@services/workoutService';
import type { Routine } from '@models/routine';
import styles from './RoutineList.module.css';

export function RoutineListPage() {
  const navigate = useNavigate();
  const snackbar = useSnackbar();
  const [routines, setRoutines] = useState<Routine[]>(() =>
    routineRepository.getAll(),
  );
  const [favorites, setFavorites] = useState<string[]>(() =>
    favoriteRepository.getAll(),
  );
  const [pendingDelete, setPendingDelete] = useState<Routine | null>(null);

  const toggleFavorite = (routine: Routine) => {
    favoriteRepository.toggle(routine.id);
    setFavorites(favoriteRepository.getAll());
  };

  const startWorkout = (routine: Routine) => {
    workoutService.startSession(routine);
    navigate('/workout');
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    routineRepository.remove(pendingDelete.id);
    favoriteRepository.remove(pendingDelete.id);
    setRoutines(routineRepository.getAll());
    setFavorites(favoriteRepository.getAll());
    snackbar.show('루틴을 삭제했습니다.');
    setPendingDelete(null);
  };

  return (
    <>
      <TopAppBar title="루틴" />
      <div className={styles.page}>
        {routines.length === 0 ? (
          <EmptyState
            illustration={<Icon name="plus" size="xl" />}
            title="첫 루틴을 만들어보세요"
            description="운동 목적과 시간을 고르면 머신 중심 루틴을 만들어 드려요."
            action={
              <Button cta leftIcon="plus" onClick={() => navigate('/routines/new')}>
                루틴 만들기
              </Button>
            }
          />
        ) : (
          <div className={styles.list}>
            {routines.map((routine) => (
              <Card key={routine.id}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>
                    <Text variant="title" as="h2">
                      {routine.name}
                    </Text>
                    <Text variant="body-small" color="secondary">
                      운동 {routine.exercises.length}개 · 약{' '}
                      {routine.estimatedDurationMin}분
                    </Text>
                  </div>
                  <div className={styles.cardMenu}>
                    <IconButton
                      icon={favorites.includes(routine.id) ? 'favorite-filled' : 'favorite'}
                      label={favorites.includes(routine.id) ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                      onClick={() => toggleFavorite(routine)}
                    />
                    <IconButton
                      icon="edit"
                      label="루틴 편집"
                      onClick={() => navigate(`/routines/${routine.id}/edit`)}
                    />
                    <IconButton
                      icon="delete"
                      label="루틴 삭제"
                      tone="danger"
                      onClick={() => setPendingDelete(routine)}
                    />
                  </div>
                </div>
                <Button
                  fullWidth
                  leftIcon="play"
                  onClick={() => startWorkout(routine)}
                >
                  운동 시작
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>

      {routines.length > 0 ? (
        <Fab icon="plus" label="루틴 만들기" onClick={() => navigate('/routines/new')} />
      ) : null}

      <Dialog
        open={pendingDelete !== null}
        title="루틴을 삭제할까요?"
        description={
          pendingDelete
            ? `'${pendingDelete.name}' 루틴이 삭제됩니다. 이 작업은 되돌릴 수 없습니다.`
            : ''
        }
        confirmLabel="삭제"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
