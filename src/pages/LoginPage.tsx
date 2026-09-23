/**
 * LoginPage — 프로필 선택 → 숫자 4자리 입력.
 *
 * 서버가 없으므로 이 화면의 모든 검증은 기기 안에서 이뤄진다.
 * 화면 단계(step):
 *   list    프로필 목록 (= 아이디 찾기). 없으면 곧바로 create 로.
 *   pin     선택한 프로필의 비밀번호 입력
 *   create  새 프로필 만들기 (이름 → PIN → 보안질문)
 *   setPin  기존 데이터를 옮겨온 프로필이 처음으로 PIN 을 정하는 단계
 *   recover 비밀번호 찾기 (보안질문 답변 → 새 PIN)
 */
import { useEffect, useState } from 'react';
import { Card, Text, Button, Input, PinPad, useSnackbar } from '@components';
import type { Profile } from '@models/profile';
import { SECURITY_QUESTIONS, securityQuestionLabel } from '@models/profile';
import {
  authService,
  PIN_LENGTH,
  isWeakPin,
  lockRemainingSec,
} from '@services/authService';
import { useAuth } from '@hooks/useAuth';
import { googleDrive, DriveError } from '@services/googleDrive';
import { profileSync, type RemoteProfile } from '@services/profileSync';
import { driveStateRepository } from '@repositories/driveStateRepository';
import styles from './Login.module.css';

type Step = 'list' | 'pin' | 'create' | 'setPin' | 'recover' | 'drive';

function initial(name: string): string {
  return name.trim().charAt(0) || '?';
}

function formatLastLogin(iso: string | null): string {
  if (!iso) return '아직 사용 기록 없음';
  const d = new Date(iso);
  return `마지막 사용 ${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export function LoginPage() {
  const { signIn } = useAuth();
  const snackbar = useSnackbar();

  const [profiles, setProfiles] = useState<Profile[]>(() => authService.listProfiles());
  const [step, setStep] = useState<Step>(() =>
    authService.listProfiles().length > 0 ? 'list' : 'create',
  );
  const [selected, setSelected] = useState<Profile | null>(null);

  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinStage, setPinStage] = useState<'enter' | 'confirm'>('enter');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lockSec, setLockSec] = useState(0);

  // 새 프로필 / 보안질문 입력
  const [name, setName] = useState('');
  const [questionId, setQuestionId] = useState(SECURITY_QUESTIONS[0].id);
  const [answer, setAnswer] = useState('');
  const [answerVerified, setAnswerVerified] = useState(false);

  /** 드라이브에서 읽어온 프로필 목록 (null = 아직 불러오지 않음) */
  const [remote, setRemote] = useState<RemoteProfile[] | null>(null);

  const reloadProfiles = () => setProfiles(authService.listProfiles());

  // 잠금 남은 시간 카운트다운
  useEffect(() => {
    if (lockSec <= 0) return;
    const t = setTimeout(() => setLockSec((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [lockSec]);

  const resetInputs = () => {
    setPin('');
    setConfirmPin('');
    setPinStage('enter');
    setError(null);
    setAnswer('');
    setAnswerVerified(false);
    setRemote(null);
  };

  const goList = () => {
    resetInputs();
    setSelected(null);
    reloadProfiles();
    setStep(profiles.length > 0 ? 'list' : 'create');
  };

  const pickProfile = (profile: Profile) => {
    resetInputs();
    setSelected(profile);
    setLockSec(lockRemainingSec(profile));
    setStep(profile.pin ? 'pin' : 'setPin');
  };

  /* ── 로그인 ─────────────────────────────────────────── */
  const submitPin = async (entered: string) => {
    if (!selected) return;
    setBusy(true);
    const result = await authService.login(selected.id, entered);
    setBusy(false);
    setPin('');

    if (result.ok) {
      signIn(result.profile);
      return;
    }
    if (result.reason === 'locked') {
      setLockSec(result.lockSec);
      setError(`비밀번호를 여러 번 틀렸습니다. 잠시 후 다시 시도해 주세요.`);
    } else if (result.reason === 'wrong-pin') {
      setError(`비밀번호가 맞지 않습니다. ${result.remainingAttempts}번 더 틀리면 잠깁니다.`);
    } else {
      setError('로그인할 수 없습니다. 프로필을 다시 선택해 주세요.');
    }
    reloadProfiles();
  };

  /* ── 새 PIN 정하기 (신규 생성 / 이전 데이터 / 재설정 공용) ── */
  const submitNewPin = async (entered: string) => {
    if (pinStage === 'enter') {
      if (isWeakPin(entered)) {
        setError('1234, 0000 처럼 쉬운 번호는 사용할 수 없습니다.');
        setPin('');
        return;
      }
      setConfirmPin(entered);
      setPin('');
      setPinStage('confirm');
      setError(null);
      return;
    }

    // 확인 단계
    if (entered !== confirmPin) {
      setError('두 번 입력한 비밀번호가 다릅니다. 다시 정해 주세요.');
      setPin('');
      setConfirmPin('');
      setPinStage('enter');
      return;
    }

    setBusy(true);
    if (step === 'create') {
      const result = await authService.createProfile({
        name,
        pin: entered,
        questionId,
        answer,
      });
      setBusy(false);
      if (!result.ok) {
        setError(result.error);
        setPin('');
        setPinStage('enter');
        return;
      }
      snackbar.show(`${result.profile.name} 프로필을 만들었습니다.`, {
        tone: 'success',
        icon: 'success',
      });
      signIn(result.profile);
      return;
    }

    // setPin / recover — 기존 프로필의 PIN 설정
    if (!selected) {
      setBusy(false);
      return;
    }
    const result = await authService.resetPin(selected.id, entered);
    if (result.ok && step === 'setPin' && !selected.security) {
      // 이전 데이터를 옮겨온 프로필은 보안질문이 없다 → 함께 등록
      await authService.setSecurityQuestion(selected.id, questionId, answer);
    }
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      setPin('');
      setPinStage('enter');
      return;
    }
    const updated = authService.listProfiles().find((p) => p.id === selected.id);
    const login = await authService.login(selected.id, entered);
    if (login.ok) {
      snackbar.show('비밀번호를 설정했습니다.', { tone: 'success', icon: 'success' });
      signIn(login.profile);
    } else if (updated) {
      setSelected(updated);
      setStep('pin');
      resetInputs();
    }
  };

  /* ── 비밀번호 찾기 ─────────────────────────────────── */
  const submitAnswer = async () => {
    if (!selected) return;
    setBusy(true);
    const ok = await authService.verifySecurityAnswer(selected.id, answer);
    setBusy(false);
    if (!ok) {
      setError('답이 맞지 않습니다. 띄어쓰기는 무시되니 편하게 입력하세요.');
      return;
    }
    setAnswerVerified(true);
    setError(null);
    setPin('');
    setPinStage('enter');
  };

  /* ── 렌더 ──────────────────────────────────────────── */
  const brand = (
    <div className={styles.brand}>
      <img
        className={styles.logo}
        src={`${import.meta.env.BASE_URL}favicon.svg`}
        alt=""
        width={64}
        height={64}
      />
      <Text variant="headline" as="h1">Workout Coach</Text>
    </div>
  );

  const pinLabel =
    pinStage === 'confirm' ? '한 번 더 입력해 주세요' : `숫자 ${PIN_LENGTH}자리를 정해 주세요`;

  return (
    <main id="main" className={styles.page}>
      {brand}

      {/* ── 프로필 목록 ── */}
      {step === 'list' ? (
        <>
          <Text variant="body" color="secondary">사용할 프로필을 선택하세요.</Text>
          <div className={styles.profiles}>
            {profiles.map((p) => (
              <button
                key={p.id}
                type="button"
                className={styles.profileBtn}
                onClick={() => pickProfile(p)}
              >
                <span className={styles.avatar} aria-hidden="true">{initial(p.name)}</span>
                <span className={styles.profileText}>
                  <Text variant="title" as="span">{p.name}</Text>
                  <Text variant="caption" color="secondary">{formatLastLogin(p.lastLoginAt)}</Text>
                </span>
              </button>
            ))}
          </div>
          <Button variant="outlined" fullWidth leftIcon="plus" onClick={() => { resetInputs(); setName(''); setStep('create'); }}>
            새 프로필 만들기
          </Button>
          {googleDrive.isConfigured() ? (
            <Button variant="text" fullWidth onClick={() => { resetInputs(); setStep('drive'); }}>
              구글 드라이브에서 불러오기
            </Button>
          ) : null}
        </>
      ) : null}

      {/* ── 구글 드라이브에서 프로필 가져오기 (브라우저·기기를 옮겼을 때) ── */}
      {step === 'drive' ? (
        <>
          <Card>
            <Text variant="title" as="h2">구글 드라이브에서 불러오기</Text>
            <Text variant="body-small" color="secondary" style={{ marginTop: 4 }}>
              전에 쓰던 브라우저에서 드라이브에 저장해 두었다면, 여기서 프로필을 가져와
              기록을 이어서 볼 수 있습니다. 비밀번호는 쓰시던 것 그대로입니다.
            </Text>
          </Card>

          {remote === null ? (
            <Button
              fullWidth
              cta
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError(null);
                try {
                  if (!googleDrive.isConnected()) await googleDrive.connect();
                  setRemote(await profileSync.listRemote());
                } catch (e) {
                  setError(e instanceof DriveError ? e.message : '드라이브를 열지 못했습니다.');
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? '연결 중…' : '구글 계정 연결'}
            </Button>
          ) : remote.length === 0 ? (
            <Text variant="body" color="secondary">
              드라이브에 저장된 프로필이 없습니다.
            </Text>
          ) : (
            <div className={styles.profiles}>
              {remote.map((r) => (
                <button
                  key={r.fileId}
                  type="button"
                  className={styles.profileBtn}
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    setError(null);
                    try {
                      const restored = await profileSync.download(r.fileId);
                      driveStateRepository.setEnabled(true);
                      driveStateRepository.setLastSyncedAt(restored.id, r.syncedAt);
                      reloadProfiles();
                      snackbar.show(`${restored.name} 프로필을 가져왔습니다.`, {
                        tone: 'success',
                        icon: 'success',
                      });
                      pickProfile(restored);
                    } catch (e) {
                      setError(e instanceof DriveError ? e.message : '가져오지 못했습니다.');
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <span className={styles.avatar} aria-hidden="true">{initial(r.profile.name)}</span>
                  <span className={styles.profileText}>
                    <Text variant="title" as="span">{r.profile.name}</Text>
                    <Text variant="caption" color="secondary">
                      {r.existsLocally ? '이 기기에도 있음 · 덮어씁니다' : '드라이브에 저장됨'}
                    </Text>
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className={styles.message}>
            {error ? <Text variant="body-small" className={styles.error}>{error}</Text> : null}
          </div>
          <Button variant="text" fullWidth onClick={goList}>돌아가기</Button>
        </>
      ) : null}

      {/* ── 비밀번호 입력 ── */}
      {step === 'pin' && selected ? (
        <>
          <Text variant="title" as="h2">{selected.name}</Text>
          <PinPad
            value={pin}
            onChange={(v) => { setPin(v); setError(null); }}
            onComplete={submitPin}
            disabled={busy || lockSec > 0}
            error={!!error && !busy}
          />
          <div className={styles.message}>
            {lockSec > 0 ? (
              <Text variant="body-small" className={styles.error}>
                {lockSec}초 후에 다시 시도할 수 있습니다.
              </Text>
            ) : error ? (
              <Text variant="body-small" className={styles.error}>{error}</Text>
            ) : null}
          </div>
          <div className={styles.actions}>
            {selected.security ? (
              <Button variant="text" fullWidth onClick={() => { resetInputs(); setStep('recover'); }}>
                비밀번호를 잊으셨나요?
              </Button>
            ) : (
              <Text variant="caption" color="secondary" className={styles.footNote}>
                이 프로필에는 보안 질문이 없어 비밀번호를 찾을 수 없습니다.
                로그인 후 설정에서 등록해 주세요.
              </Text>
            )}
            <Button variant="text" fullWidth onClick={goList}>다른 프로필 선택</Button>
          </div>
        </>
      ) : null}

      {/* ── 새 프로필 / 이전 데이터 프로필의 PIN 설정 ── */}
      {step === 'create' || step === 'setPin' ? (
        <>
          <Card>
            <Text variant="title" as="h2">
              {step === 'setPin' ? '비밀번호를 정해 주세요' : '새 프로필 만들기'}
            </Text>
            {step === 'setPin' ? (
              <Text variant="body-small" color="secondary" style={{ marginTop: 4 }}>
                기존에 쌓인 운동 기록을 <b>{selected?.name}</b> 프로필로 옮겼습니다.
                앞으로 쓸 비밀번호와 보안 질문을 정해 주세요.
              </Text>
            ) : null}

            {step === 'create' ? (
              <div style={{ marginTop: 12 }}>
                <Input
                  label="이름"
                  placeholder="예: 영주"
                  value={name}
                  maxLength={20}
                  onChange={(e) => { setName(e.target.value); setError(null); }}
                />
              </div>
            ) : null}

            <div style={{ marginTop: 16 }}>
              <Text variant="label" as="h3">비밀번호를 잊었을 때 쓸 질문</Text>
              <select
                className="native-select"
                value={questionId}
                onChange={(e) => setQuestionId(e.target.value)}
                aria-label="보안 질문 선택"
              >
                {SECURITY_QUESTIONS.map((q) => (
                  <option key={q.id} value={q.id}>{q.label}</option>
                ))}
              </select>
              <div style={{ marginTop: 12 }}>
                <Input
                  label="답"
                  placeholder="띄어쓰기·대소문자는 구분하지 않습니다"
                  value={answer}
                  maxLength={40}
                  onChange={(e) => { setAnswer(e.target.value); setError(null); }}
                />
              </div>
            </div>
          </Card>

          <Text variant="body" color="secondary">{pinLabel}</Text>
          <PinPad
            value={pin}
            onChange={(v) => { setPin(v); setError(null); }}
            onComplete={submitNewPin}
            disabled={busy || (step === 'create' && !name.trim()) || !answer.trim()}
            error={!!error}
          />
          <div className={styles.message}>
            {error ? (
              <Text variant="body-small" className={styles.error}>{error}</Text>
            ) : (step === 'create' && !name.trim()) || !answer.trim() ? (
              <Text variant="body-small" color="secondary">
                위 항목을 먼저 채워 주세요.
              </Text>
            ) : null}
          </div>
          {profiles.length > 0 ? (
            <Button variant="text" fullWidth onClick={goList}>돌아가기</Button>
          ) : null}
        </>
      ) : null}

      {/* ── 비밀번호 찾기 ── */}
      {step === 'recover' && selected ? (
        <>
          <Card>
            <Text variant="title" as="h2">비밀번호 찾기</Text>
            <Text variant="body-small" color="secondary" style={{ marginTop: 4 }}>
              {selected.name} 님의 보안 질문입니다.
            </Text>
            <Text variant="body" as="p" style={{ marginTop: 12 }}>
              {selected.security ? securityQuestionLabel(selected.security.questionId) : ''}
            </Text>
            {!answerVerified ? (
              <div style={{ marginTop: 12 }}>
                <Input
                  label="답"
                  value={answer}
                  maxLength={40}
                  onChange={(e) => { setAnswer(e.target.value); setError(null); }}
                />
              </div>
            ) : (
              <Text variant="body-small" color="success" style={{ marginTop: 12 }}>
                확인되었습니다. 새 비밀번호를 정해 주세요.
              </Text>
            )}
          </Card>

          {!answerVerified ? (
            <Button fullWidth cta onClick={submitAnswer} disabled={busy || !answer.trim()}>
              확인
            </Button>
          ) : (
            <>
              <Text variant="body" color="secondary">{pinLabel}</Text>
              <PinPad
                value={pin}
                onChange={(v) => { setPin(v); setError(null); }}
                onComplete={submitNewPin}
                disabled={busy}
                error={!!error}
              />
            </>
          )}
          <div className={styles.message}>
            {error ? <Text variant="body-small" className={styles.error}>{error}</Text> : null}
          </div>
          <Button variant="text" fullWidth onClick={() => { resetInputs(); setStep('pin'); }}>
            돌아가기
          </Button>
        </>
      ) : null}

      <Text variant="caption" color="secondary" className={styles.footNote}>
        기록은 이 기기에만 저장됩니다. 비밀번호는 저장되지 않고, 확인용 암호값만 남습니다.
      </Text>
    </main>
  );
}
