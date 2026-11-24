import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useOverlayRealtime } from '../hooks/useOverlayRealtime';
import { useSquadBoardRoster } from '../hooks/useSquadBoardRoster';
import SquadBoardPanel from '../components/overlay/SquadBoardPanel';
import OverlayFullscreenButton from '../components/common/OverlayFullscreenButton';
import { resolveSquadSize } from '../utils/squadFormation';
import { maxBidInfoForTeam } from '../utils/auctionConstraints';
import styles from './OverlayTeamSquadBoard.module.css';

const ROTATE_MS = 12000;
const AUTO_SCROLL_STORAGE_KEY = 'overlaySquadBoardAutoScroll';

function readAutoScrollPreference() {
  try {
    return localStorage.getItem(AUTO_SCROLL_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export default function OverlayTeamSquadBoardPage() {
  const [params] = useSearchParams();
  const tid = params.get('tournamentId');
  const token = params.get('token');
  const { data, config } = useOverlayRealtime(tid, token, { includePlayers: true, studioOverlay: true });
  const teams = data?.teams || [];
  const squadSize = resolveSquadSize(config);
  const playerRoles = config?.playerRoles;
  const [teamIndex, setTeamIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [autoScroll, setAutoScroll] = useState(readAutoScrollPreference);
  const timerRef = useRef(null);
  const goNextRef = useRef(() => {});
  const auction = data?.auction;
  const { filledForTeam } = useSquadBoardRoster(teams, playerRoles, auction);

  const teamCount = teams.length;
  const safeIndex = teamCount ? ((teamIndex % teamCount) + teamCount) % teamCount : 0;
  const team = teams[safeIndex] ?? null;

  const filledPlayers = useMemo(() => {
    if (!team) return [];
    return filledForTeam[team.id] || [];
  }, [filledForTeam, team]);
  const maxBidInfo = useMemo(() => {
    const info = maxBidInfoForTeam(team, squadSize, auction);
    if (!info) return null;
    return { show: true, maxBid: info.maxBid, squadFull: info.squadFull };
  }, [team, auction, squadSize]);

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

  goNextRef.current = goNext;

  const toggleAutoScroll = useCallback(() => {
    setAutoScroll((on) => {
      const next = !on;
      try {
        localStorage.setItem(AUTO_SCROLL_STORAGE_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!autoScroll || teamCount <= 1) {
      clearInterval(timerRef.current);
      return undefined;
    }
    clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => goNextRef.current(), ROTATE_MS);
    return () => clearInterval(timerRef.current);
  }, [autoScroll, teamCount]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        goNext();
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goPrev();
      }
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
          <div className={styles.topBar}>
            <div className={styles.teamIndicator}>
              {safeIndex + 1} / {teamCount} · {team.name}
            </div>
            <button
              type="button"
              className={`${styles.autoScrollToggle} ${autoScroll ? styles.autoScrollOn : ''}`}
              onClick={toggleAutoScroll}
              aria-pressed={autoScroll}
              title="Auto-rotate teams every 12 seconds"
            >
              Auto-scroll {autoScroll ? 'On' : 'Off'}
              <span className={styles.autoScrollHint}> · ← → manual</span>
            </button>
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
          variant="overlay"
          kicker="Team Squad Board"
          maxBidInfo={maxBidInfo}
        />
      </div>
    </div>
  );
}
