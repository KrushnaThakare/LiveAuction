import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useOverlayRealtime } from '../hooks/useOverlayRealtime';
import SquadBoardPanel from '../components/overlay/SquadBoardPanel';
import OverlayFullscreenButton from '../components/common/OverlayFullscreenButton';
import {
  boardPlayersFromTeam,
  resolveSquadSize,
} from '../utils/squadFormation';
import styles from './OverlayTeamSquadBoard.module.css';

const ROTATE_MS = 8000;

export default function OverlayTeamSquadBoardPage() {
  const [params] = useSearchParams();
  const tid = params.get('tournamentId');
  const token = params.get('token');
  const { data, config } = useOverlayRealtime(tid, token, { includePlayers: true });
  const teams = data?.teams || [];
  const squadSize = resolveSquadSize(config);
  const [teamIndex, setTeamIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const timerRef = useRef(null);

  const teamCount = teams.length;
  const safeIndex = teamCount ? ((teamIndex % teamCount) + teamCount) % teamCount : 0;
  const team = teams[safeIndex];

  const goTo = useCallback((nextIndex) => {
    if (!teamCount) return;
    setVisible(false);
    window.setTimeout(() => {
      setTeamIndex(((nextIndex % teamCount) + teamCount) % teamCount);
      setVisible(true);
    }, 180);
  }, [teamCount]);

  const goNext = useCallback(() => goTo(safeIndex + 1), [goTo, safeIndex]);
  const goPrev = useCallback(() => goTo(safeIndex - 1), [goTo, safeIndex]);

  useEffect(() => {
    if (teamCount <= 1) return undefined;
    clearInterval(timerRef.current);
    timerRef.current = window.setInterval(goNext, ROTATE_MS);
    return () => clearInterval(timerRef.current);
  }, [goNext, teamCount, safeIndex]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'ArrowRight') goNext();
      if (event.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev]);

  if (!data && !config) {
    return (
      <div className={styles.stage}>
        <div className={styles.connecting}>Connecting squad board overlay…</div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className={styles.stage}>
        <div className={styles.connecting}>No teams available</div>
      </div>
    );
  }

  const filledPlayers = boardPlayersFromTeam(team, config?.playerRoles, true);

  return (
    <div className={styles.stage}>
      <OverlayFullscreenButton />
      <div className={styles.backdrop} />

      {teamCount > 1 && (
        <>
          <button type="button" className={`${styles.navBtn} ${styles.navLeft}`} onClick={goPrev} aria-label="Previous team">
            <ChevronLeft size={42} />
          </button>
          <button type="button" className={`${styles.navBtn} ${styles.navRight}`} onClick={goNext} aria-label="Next team">
            <ChevronRight size={42} />
          </button>
          <div className={styles.teamIndicator}>
            {safeIndex + 1} / {teamCount} · {team.name}
          </div>
        </>
      )}

      <div className={`${styles.boardWrap} ${visible ? styles.boardVisible : styles.boardHidden}`}>
        <SquadBoardPanel
          team={team}
          filledPlayers={filledPlayers}
          squadSize={squadSize}
          showPrices
          showNextSlot
          kicker="Team Squad Board"
        />
      </div>
    </div>
  );
}
