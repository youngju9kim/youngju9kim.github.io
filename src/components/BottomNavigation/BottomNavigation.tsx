/**
 * BottomNavigation — NAV-001 (03 §18, 02 §6~7).
 * 5개 탭: Home / Routines / History / Statistics / Settings. 항상 표시하되
 * 운동 진행/휴식/요약 화면에서는 렌더하지 않는다(레이아웃에서 제어, NAV-002/006).
 * 활성 탭은 색상뿐 아니라 형태 변화로도 구분(A11Y-002).
 */
import { NavLink } from 'react-router-dom';
import { Icon, type IconName } from '@components/Icon/Icon';
import styles from './BottomNavigation.module.css';

interface Tab {
  to: string;
  label: string;
  icon: IconName;
}

const TABS: Tab[] = [
  { to: '/', label: '홈', icon: 'home' },
  // 루틴을 만든 뒤에는 목록으로 갈 길이 없어 편집·교체 기능에 닿지 못했다(2026-09-28).
  { to: '/routines', label: '루틴', icon: 'list' },
  { to: '/history', label: '기록', icon: 'history' },
  { to: '/statistics', label: '통계', icon: 'statistics' },
  { to: '/settings', label: '설정', icon: 'settings' },
];

export function BottomNavigation() {
  return (
    <nav className={styles.nav} aria-label="주요 메뉴">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) =>
            [styles.tab, isActive && styles.active].filter(Boolean).join(' ')
          }
        >
          {({ isActive }) => (
            <>
              <span className={styles.iconWrap} aria-hidden="true">
                <Icon name={tab.icon} size="m" />
              </span>
              <span className={styles.tabLabel}>{tab.label}</span>
              {isActive ? <span className="sr-only">(선택됨)</span> : null}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
