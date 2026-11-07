import { useState } from 'react';
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
  const [open, setOpen] = useState(false);
  const squadMode = mode === 'squadBoard';

  const pickMode = (next) => {
    onModeChange(next);
    setOpen(false);
  };

  return (
    <div className={`${styles.host} ${open ? styles.hostOpen : ''}`}>
      <button
        type="button"
        className={styles.trigger}
        title="Display options"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
      >
        <LayoutGrid size={22} />
      </button>
      {open && (
        <div className={styles.panel} role="menu">
          <p className={styles.panelTitle}>Studio</p>
          {!squadMode ? (
            <button type="button" className={styles.actionBtn} onClick={() => pickMode('squadBoard')}>
              <LayoutGrid size={16} />
              Team squad board
            </button>
          ) : (
            <>
              <button type="button" className={styles.actionBtn} onClick={() => pickMode('audience')}>
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
      )}
    </div>
  );
}
