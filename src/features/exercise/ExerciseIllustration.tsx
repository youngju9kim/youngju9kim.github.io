/**
 * ExerciseIllustration — 운동 자세 이미지.
 *
 * 사용자가 등록한 실제 자세 사진(public/exercises/<id>-<단계>.webp)이 있으면 그것을 쓰고,
 * 없으면 05_IMAGE_STYLE_GUIDE 규격의 플랫 SVG 플레이스홀더로 대체한다.
 * `step` 은 자세 가이드 단계(0-based)로, 단계가 넘어가면 사진도 함께 바뀐다.
 */
import { useState } from 'react';
import type { Exercise } from '@models/exercise';
import { getExercisePhotoForStep } from './exercisePhotos';
import styles from './ExerciseIllustration.module.css';

export interface ExerciseIllustrationProps {
  exercise: Exercise;
  size?: number;
  /** 자세 가이드 단계(0-based). 기본 0 = 시작 자세 */
  step?: number;
  /** fill: 부모 영역을 꽉 채움(운동 상세의 큰 이미지 영역) */
  variant?: 'square' | 'fill';
}

export function ExerciseIllustration({
  exercise,
  size = 120,
  step = 0,
  variant = 'square',
}: ExerciseIllustrationProps) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const fill = variant === 'fill';
  const photo = photoFailed ? null : getExercisePhotoForStep(exercise.id, step);

  if (photo) {
    return (
      <img
        className={[styles.photo, fill && styles.fill].filter(Boolean).join(' ')}
        src={photo}
        width={fill ? undefined : size}
        height={fill ? undefined : size}
        alt={`${exercise.displayName} ${step + 1}단계 자세`}
        loading="lazy"
        decoding="async"
        onError={() => setPhotoFailed(true)}
      />
    );
  }

  return (
    <svg
      width={fill ? '100%' : size}
      height={fill ? '100%' : size}
      viewBox="0 0 120 120"
      role="img"
      aria-label={`${exercise.displayName} 일러스트`}
    >
      {/* 배경(표면 톤) */}
      <rect
        width="120"
        height="120"
        rx="16"
        fill="var(--color-surface-sunken)"
      />
      {/* 머신 프레임(단순화) */}
      <g
        fill="none"
        stroke="var(--color-text-secondary)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="26" y="30" width="68" height="52" rx="6" />
        <line x1="26" y1="82" x2="26" y2="98" />
        <line x1="94" y1="82" x2="94" y2="98" />
      </g>
      {/* 인체(단순 실루엣) — 주 타깃 근육을 primary 톤으로 강조 */}
      <g>
        <circle cx="60" cy="48" r="8" fill="var(--color-text-secondary)" />
        <rect
          x="52"
          y="58"
          width="16"
          height="22"
          rx="6"
          fill="var(--color-primary)"
        />
      </g>
      {/* 움직임 방향 화살표(단방향) */}
      <g stroke="var(--color-primary)" strokeWidth="3" strokeLinecap="round" fill="none">
        <line x1="78" y1="46" x2="90" y2="46" />
        <path d="M86 42 L90 46 L86 50" />
      </g>
    </svg>
  );
}
