/**
 * ExerciseVideoSettingsPage — 운동별 영상 관리(설정).
 * 운동마다 유튜브 URL 과 재생 구간(시작~끝 초)을 지정한다. 비우면 내장 영상/일러스트로 복귀.
 * 관련: 사용자 요청(운동별 내장 영상 또는 유튜브 영상 재생).
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TopAppBar, Card, Text, Input, Chip } from '@components';
import { exerciseRepository } from '@repositories/exerciseRepository';
import { settingsRepository } from '@repositories/settingsRepository';
import { hasBundledVideo } from '@features/exercise/bundledVideos';
import { parseYouTubeId } from '@utils/youtube';
import { CATEGORY_LABELS } from '@constants/labels';
import styles from './VideoSettings.module.css';

interface Draft {
  url: string;
  start: string;
  end: string;
}

export function ExerciseVideoSettingsPage() {
  const navigate = useNavigate();
  const exercises = exerciseRepository.getAll();

  const [drafts, setDrafts] = useState<Record<string, Draft>>(() => {
    const init: Record<string, Draft> = {};
    for (const ex of exercises) {
      const o = settingsRepository.getVideoOverride(ex.id);
      init[ex.id] = {
        url: o?.youtubeUrl ?? '',
        start: o?.startSec != null ? String(o.startSec) : '',
        end: o?.endSec != null ? String(o.endSec) : '',
      };
    }
    return init;
  });

  const update = (id: string, patch: Partial<Draft>) => {
    const next = { ...drafts[id], ...patch };
    setDrafts((d) => ({ ...d, [id]: next }));
    settingsRepository.setVideoOverride(
      id,
      next.url.trim()
        ? {
            youtubeUrl: next.url.trim(),
            startSec: next.start ? Number(next.start) : undefined,
            endSec: next.end ? Number(next.end) : undefined,
          }
        : null,
    );
  };

  return (
    <>
      <TopAppBar title="운동 영상 관리" onBack={() => navigate('/settings')} />
      <div className={styles.page}>
        <Text variant="body-small" color="secondary">
          운동마다 유튜브 URL 을 넣으면 그 영상을 재생합니다(3~10초 구간 지정 가능).
          비우면 앱 내장 영상이나 일러스트가 표시됩니다.
        </Text>

        {exercises.map((ex) => {
          const d = drafts[ex.id];
          const valid = d.url.trim() ? parseYouTubeId(d.url) !== null : true;
          const source = d.url.trim()
            ? valid
              ? '유튜브'
              : 'URL 오류'
            : hasBundledVideo(ex.imageId)
              ? '내장 영상'
              : '일러스트';
          return (
            <Card key={ex.id}>
              <div className={styles.head}>
                <Text variant="title" as="h2">
                  {ex.displayName}
                </Text>
                <Chip variant={valid ? 'outlined' : 'warning'}>{source}</Chip>
              </div>
              <Text variant="caption" color="secondary">
                {CATEGORY_LABELS[ex.category]} · {ex.englishName}
              </Text>
              <div className={styles.field}>
                <Input
                  label="유튜브 URL"
                  placeholder="https://youtu.be/..."
                  value={d.url}
                  inputMode="url"
                  errorText={!valid ? '유튜브 URL 을 확인해 주세요.' : undefined}
                  onChange={(e) => update(ex.id, { url: e.target.value })}
                />
              </div>
              {d.url.trim() && valid ? (
                <div className={styles.range}>
                  <Input
                    label="시작(초)"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={d.start}
                    onChange={(e) => update(ex.id, { start: e.target.value })}
                  />
                  <Input
                    label="끝(초)"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={d.end}
                    onChange={(e) => update(ex.id, { end: e.target.value })}
                  />
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>
    </>
  );
}
