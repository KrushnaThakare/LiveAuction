import { LayoutGrid, Monitor, ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './AudienceDisplayStudioMenu.module.css';

export default function AudienceDisplayStudioMenu({
  mode,
  onModeChange,
  teamCount = 0,
  teamIndex = 0,
  onPrevTeam,
  onNextTeam,
}) {
  const squadMode = mode === 'squadBoard';

  return (
    <div className={styles.host}>
      <div className={styles.trigger} title="Display options">
        <LayoutGrid size={22} />
      </div>
      <div className={styles.panel}>
        <p className={styles.panelTitle}>Studio</p>
        {!squadMode ? (
          <button type="button" className={styles.actionBtn} onClick={() => onModeChange('squadBoard')}>
            <LayoutGrid size={16} />
            Team squad board
          </button>
        ) : (
          <>
            <button type="button" className={styles.actionBtn} onClick={() => onModeChange('audience')}>
              <Monitor size={16} />
              Back to audience display
            </button>
            {teamCount > 1 && (
              <div className={styles.navRow}>
                <button type="button" className={styles.iconBtn} onClick={onPrevTeam} aria-label="Previous team">
                  <ChevronLeft size={18} />
                </button>
                <span className={styles.teamCounter}>
                  {teamIndex + 1} / {teamCount}
                </span>
                <button type="button" className={styles.iconBtn} onClick={onNextTeam} aria-label="Next team">
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
