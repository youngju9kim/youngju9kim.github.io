/**
 * SettingsPage — SC-010 Settings (FR-002/017/018/019).
 * 테마·단위·기본 휴식(즉시 저장) + 데이터 백업/복원/초기화.
 * 파괴적 작업(복원 덮어쓰기·초기화)은 확인 Dialog(STR-003, INT-006).
 */
import { useRef, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TopAppBar,
  Card,
  Text,
  Button,
  Input,
  Stepper,
  Dialog,
  useSnackbar,
} from '@components';
import { useTheme } from '@hooks/useTheme';
import {
  settingsRepository,
  type ThemePreference,
  type WeightUnit,
  type Sex,
  type UserProfile,
} from '@repositories/settingsRepository';
import {
  INTENSITY_LABELS,
  INTENSITY_DESCRIPTIONS,
  type Intensity,
} from '@services/weightRecommender';
import { backupService } from '@services/backupService';
import { appService } from '@services/appService';
import styles from './Settings.module.css';

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: 'sun' | 'moon' | 'settings' }[] = [
  { value: 'light', label: '라이트', icon: 'sun' },
  { value: 'dark', label: '다크', icon: 'moon' },
  { value: 'system', label: '시스템', icon: 'settings' },
];

const UNIT_OPTIONS: WeightUnit[] = ['kg', 'lb'];

const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: 'female', label: '여성' },
  { value: 'male', label: '남성' },
  { value: 'unset', label: '선택 안 함' },
];

const INTENSITY_OPTIONS: Intensity[] = ['light', 'normal', 'strong'];

export function SettingsPage() {
  const navigate = useNavigate();
  const { preference, setPreference } = useTheme();
  const snackbar = useSnackbar();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [unit, setUnit] = useState<WeightUnit>(() => settingsRepository.getUnit());
  const [restSec, setRestSec] = useState(() => settingsRepository.getDefaultRestSec());
  const [name, setName] = useState(() => settingsRepository.getUserName());
  const [resetOpen, setResetOpen] = useState(false);
  const [restoreText, setRestoreText] = useState<string | null>(null);
  const [profile, setProfileState] = useState<UserProfile>(() =>
    settingsRepository.getProfile(),
  );

  const patchProfile = (patch: Partial<UserProfile>) => {
    setProfileState(settingsRepository.setProfile(patch));
  };

  const changeUnit = (u: WeightUnit) => {
    settingsRepository.setUnit(u);
    setUnit(u);
    snackbar.show(`단위를 ${u} 로 변경했습니다.`, { tone: 'success', icon: 'success' });
  };

  const changeRest = (sec: number) => {
    settingsRepository.setDefaultRestSec(sec);
    setRestSec(sec);
  };

  const onPickFile = () => fileInputRef.current?.click();

  const onFileSelected = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // 같은 파일 재선택 허용
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setRestoreText(String(reader.result));
    reader.onerror = () => snackbar.show('파일을 읽지 못했습니다.', { tone: 'error', icon: 'error' });
    reader.readAsText(file);
  };

  const confirmRestore = () => {
    if (!restoreText) return;
    const result = backupService.restore(restoreText);
    setRestoreText(null);
    if (result.ok) {
      snackbar.show('데이터를 복원했습니다.', { tone: 'success', icon: 'success' });
      setTimeout(() => navigate('/', { replace: true }), 300);
    } else {
      snackbar.show(result.error ?? '복원에 실패했습니다.', { tone: 'error', icon: 'error' });
    }
  };

  const confirmReset = () => {
    appService.reset();
    setResetOpen(false);
    snackbar.show('모든 데이터를 초기화했습니다.');
    setTimeout(() => navigate('/', { replace: true }), 300);
  };

  return (
    <>
      <TopAppBar title="설정" />
      <div className={styles.page}>
        {/* 프로필: 홈 인사말 이름 */}
        <Card>
          <Text variant="title" as="h2">프로필</Text>
          <div style={{ marginTop: 12 }}>
            <Input
              label="이름 (홈 인사말에 표시)"
              placeholder="예: 영주"
              value={name}
              maxLength={20}
              onChange={(e) => {
                setName(e.target.value);
                settingsRepository.setUserName(e.target.value);
              }}
            />
          </div>
        </Card>

        {/* 신체 정보 — 처음 하는 운동의 시작 중량 추천에 사용 */}
        <Card>
          <Text variant="title" as="h2">내 몸 정보</Text>
          <Text variant="body-small" color="secondary" style={{ marginTop: 4, marginBottom: 12 }}>
            처음 하는 운동의 시작 중량을 자동으로 추천하는 데 쓰입니다.
            이미 해본 운동은 지난번에 사용한 중량이 그대로 나옵니다.
          </Text>

          <Text variant="label" as="h3">성별</Text>
          <div className={styles.optionGroup} role="group" aria-label="성별 선택">
            {SEX_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant={profile.sex === opt.value ? 'filled' : 'outlined'}
                onClick={() => patchProfile({ sex: opt.value })}
                aria-pressed={profile.sex === opt.value}
              >
                {opt.label}
              </Button>
            ))}
          </div>

          <div className={styles.profileRow}>
            <Stepper
              label="나이"
              value={profile.age}
              min={14}
              max={100}
              step={1}
              unit="세"
              onChange={(age) => patchProfile({ age })}
            />
            <Stepper
              label="체중"
              value={profile.bodyWeightKg}
              min={30}
              max={200}
              step={1}
              unit={unit}
              onChange={(bodyWeightKg) => patchProfile({ bodyWeightKg })}
            />
          </div>

          <Text variant="label" as="h3" style={{ marginTop: 16 }}>운동 강도</Text>
          <div className={styles.optionGroup} role="group" aria-label="운동 강도 선택">
            {INTENSITY_OPTIONS.map((value) => (
              <Button
                key={value}
                variant={profile.intensity === value ? 'filled' : 'outlined'}
                onClick={() => patchProfile({ intensity: value })}
                aria-pressed={profile.intensity === value}
              >
                {INTENSITY_LABELS[value]}
              </Button>
            ))}
          </div>
          <Text variant="body-small" color="secondary" style={{ marginTop: 8 }}>
            {INTENSITY_DESCRIPTIONS[profile.intensity]}
          </Text>

          <Text variant="body-small" color="secondary" style={{ marginTop: 12 }}>
            ⚠️ 추천 중량은 출발점일 뿐입니다. 첫 세트에서 가볍게 느껴지면 올리고,
            무겁거나 자세가 흐트러지면 반드시 낮춰 주세요.
          </Text>
        </Card>

        {/* 테마 (FR-002) */}
        <Card>
          <Text variant="title" as="h2">테마</Text>
          <div className={styles.optionGroup} role="group" aria-label="테마 선택">
            {THEME_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant={preference === opt.value ? 'filled' : 'outlined'}
                leftIcon={opt.icon}
                onClick={() => setPreference(opt.value)}
                aria-pressed={preference === opt.value}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </Card>

        {/* 단위 (FR-002) */}
        <Card>
          <Text variant="title" as="h2">중량 단위</Text>
          <div className={styles.optionGroup} role="group" aria-label="단위 선택">
            {UNIT_OPTIONS.map((u) => (
              <Button
                key={u}
                variant={unit === u ? 'filled' : 'outlined'}
                onClick={() => changeUnit(u)}
                aria-pressed={unit === u}
              >
                {u}
              </Button>
            ))}
          </div>
        </Card>

        {/* 기본 휴식 시간 (FR-002) */}
        <Card>
          <Text variant="title" as="h2">기본 휴식 시간</Text>
          <Text variant="body-small" color="secondary" style={{ marginTop: 4, marginBottom: 12 }}>
            새 루틴을 만들 때 적용되는 기본값입니다.
          </Text>
          <Stepper
            label="휴식(초)"
            value={restSec}
            min={0}
            max={300}
            step={15}
            unit="초"
            onChange={changeRest}
          />
        </Card>

        {/* 운동 영상 관리 */}
        <Card>
          <Text variant="title" as="h2">운동 영상</Text>
          <Text variant="body-small" color="secondary" style={{ marginTop: 4, marginBottom: 12 }}>
            운동별로 유튜브 영상 URL 을 지정할 수 있습니다.
          </Text>
          <Button variant="outlined" fullWidth leftIcon="play" onClick={() => navigate('/settings/videos')}>
            운동 영상 관리
          </Button>
        </Card>

        {/* 데이터 관리 (FR-017/018/019) */}
        <Card>
          <Text variant="title" as="h2">데이터 관리</Text>
          <div className={styles.dataActions}>
            <Button variant="outlined" fullWidth leftIcon="check" onClick={() => backupService.download()}>
              데이터 백업 (내보내기)
            </Button>
            <Button variant="outlined" fullWidth onClick={onPickFile}>
              데이터 복원 (가져오기)
            </Button>
            <Button
              variant="text"
              fullWidth
              style={{ color: 'var(--color-error)' }}
              onClick={() => setResetOpen(true)}
            >
              전체 데이터 초기화
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className={styles.hiddenInput}
            onChange={onFileSelected}
          />
        </Card>
      </div>

      {/* 복원 확인 (기존 데이터 덮어쓰기) */}
      <Dialog
        open={restoreText !== null}
        title="데이터를 복원할까요?"
        description="현재 데이터가 백업 파일의 내용으로 교체됩니다. 이 작업은 되돌릴 수 없습니다."
        confirmLabel="복원"
        destructive
        onConfirm={confirmRestore}
        onCancel={() => setRestoreText(null)}
      />

      {/* 초기화 확인 (FR-019) */}
      <Dialog
        open={resetOpen}
        title="모든 데이터를 초기화할까요?"
        description="루틴·운동 기록·통계·설정이 모두 삭제되고 최초 실행 상태로 돌아갑니다. 이 작업은 되돌릴 수 없습니다."
        confirmLabel="초기화"
        destructive
        onConfirm={confirmReset}
        onCancel={() => setResetOpen(false)}
      />
    </>
  );
}
