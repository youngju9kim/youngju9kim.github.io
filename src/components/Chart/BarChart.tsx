/**
 * BarChart — CHART-002 (03 §23). 항목 간 비교.
 * 색상 외에 레이블과 수치를 함께 제공(공통 규칙). 데이터 없으면 상위에서 Empty State 처리.
 */
import styles from './BarChart.module.css';

export interface BarDatum {
  label: string;
  value: number;
  /** 막대 위/툴팁에 표시할 텍스트(미지정 시 value) */
  display?: string;
}

export interface BarChartProps {
  data: BarDatum[];
  /** 세로축 단위 라벨(접근성 설명용) */
  ariaLabel?: string;
}

export function BarChart({ data, ariaLabel = '막대 차트' }: BarChartProps) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className={styles.chart} role="img" aria-label={ariaLabel}>
      {data.map((d, i) => (
        <div key={i} className={styles.col}>
          <span className={styles.value}>{d.display ?? d.value}</span>
          <div className={styles.barTrack}>
            <div
              className={styles.bar}
              style={{ height: `${(d.value / max) * 100}%` }}
            />
          </div>
          <span className={styles.label}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}
