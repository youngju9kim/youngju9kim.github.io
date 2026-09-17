/**
 * ExerciseVideo — 운동 데모 영상 재생(3~10초 루프). 없으면 일러스트로 대체.
 *
 * 재생 우선순위:
 *  1) 설정의 유튜브 오버라이드 → 임베드(구간 지원)
 *  2) 내장 영상(public/videos/{imageId}.mp4, bundledVideos 등록 시) → 자동재생·음소거·루프
 *  3) 사용자가 등록한 단계별 자세 사진 → 없으면 플랫 일러스트
 *
 * variant='square' : size(px) 정사각 프레임(목록 썸네일 등)
 * variant='fill'   : 부모 영역을 꽉 채움(운동 상세의 큰 영상 영역). 영상 전체가 보이도록 contain.
 */
import { useState } from 'react';
import type { Exercise } from '@models/exercise';
import { ExerciseIllustration } from './ExerciseIllustration';
import { hasBundledVideo } from './bundledVideos';
import { settingsRepository } from '@repositories/settingsRepository';
import { parseYouTubeId, buildYouTubeEmbedUrl } from '@utils/youtube';
import styles from './ExerciseVideo.module.css';

export interface ExerciseVideoProps {
  exercise: Exercise;
  variant?: 'square' | 'fill';
  /** square 모드 한 변(px) */
  size?: number;
  /** 자세 가이드 단계(0-based). 사진으로 대체될 때 단계에 맞는 컷을 보여준다. */
  step?: number;
}

export function ExerciseVideo({
  exercise,
  variant = 'square',
  size = 220,
  step = 0,
}: ExerciseVideoProps) {
  const [videoFailed, setVideoFailed] = useState(false);

  const fill = variant === 'fill';
  const frameClass = [styles.frame, fill && styles.fill].filter(Boolean).join(' ');
  const frameStyle = fill ? undefined : { width: size, height: size };

  const override = settingsRepository.getVideoOverride(exercise.id);
  const ytId = override ? parseYouTubeId(override.youtubeUrl) : null;

  // 1) 유튜브 오버라이드
  if (ytId) {
    return (
      <div className={frameClass} style={frameStyle}>
        <iframe
          className={styles.media}
          src={buildYouTubeEmbedUrl(ytId, override?.startSec, override?.endSec)}
          title={`${exercise.displayName} 시연 영상`}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      </div>
    );
  }

  // 2) 내장 영상
  if (hasBundledVideo(exercise.imageId) && !videoFailed) {
    return (
      <div className={frameClass} style={frameStyle}>
        <video
          className={styles.media}
          style={fill ? { objectFit: 'contain' } : undefined}
          src={`/videos/${exercise.imageId}.mp4`}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-label={`${exercise.displayName} 시연 영상`}
          onError={() => setVideoFailed(true)}
        />
      </div>
    );
  }

  // 3) 단계별 자세 사진(없으면 일러스트)
  if (fill) {
    return (
      <div className={frameClass}>
        <ExerciseIllustration exercise={exercise} step={step} variant="fill" />
      </div>
    );
  }
  return <ExerciseIllustration exercise={exercise} size={size} step={step} />;
}
