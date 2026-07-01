import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useOverlayRealtime } from '../hooks/useOverlayRealtime';
import SquadBoardPanel from '../components/overlay/SquadBoardPanel';
import OverlayFullscreenButton from '../components/common/OverlayFullscreenButton';
import {
  boardPlayersFromTeam,
  resolveSquadSize,
  toSlotPlayer,
} from '../utils/squadFormation';
import { getRoleShortLabel } from '../utils/formatters';
import styles from './OverlayTeamSquadBoard.module.css';

const ROTATE_MS = 8000;

export default function OverlayTeamSquadBoardPage() {
  const [params] = useSearchParams();
  const tid = params.get('tournamentId');
  const token = params.get('token');
  const { data, config } = useOverlayRealtime(tid, token, { includePlayers: true });
  const teams = data?.teams || [];
  const squadSize = resolveSquadSize(config);
  const playerRoles = config?.playerRoles;
  const [teamIndex, setTeamIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [rosterByTeam, setRosterByTeam] = useState({});
  const timerRef = useRef(null);
  const lastSoldKeyRef = useRef('');

  useEffect(() => {
    if (!teams.length) return;
    setRosterByTeam((current) => {
      let changed = false;
      const next = { ...current };
      for (const team of teams) {
        const serverPlayers = boardPlayersFromTeam(team, playerRoles, true);
        if (!serverPlayers.length) continue;
        const byId = new Map((next[team.id] || []).map((player) => [String(player.id), player]));
        let teamChanged = false;
        for (const player of serverPlayers) {
          const key = String(player.id);
          if (!byId.has(key)) {
            byId.set(key, player);
            teamChanged = true;
          }
        }
        if (teamChanged) {
          next[team.id] = Array.from(byId.values());
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [teams, playerRoles]);

  useEffect(() => {
    const auction = data?.auction;
    if (!auction || auction.status !== 'SOLD') return;
    const player = auction.currentPlayer;
    const teamId = auction.highestBidderTeamId;
    if (!player?.id || !teamId) return;

    const soldKey = `${auction.sessionId || 'session'}:${player.id}`;
    if (lastSoldKeyRef.current === soldKey) return;
    lastSoldKeyRef.current = soldKey;

    const slotPlayer = {
      ...toSlotPlayer(player, playerRoles),
      soldPrice: auction.currentBid ?? player.currentBid ?? player.basePrice ?? 0,
      role: getRoleShortLabel(player.role, playerRoles),
    };

    setRosterByTeam((current) => {
      const list = current[teamId] || [];
      if (list.some((entry) => String(entry.id) === String(player.id))) return current;
      return { ...current, [teamId]: [...list, slotPlayer] };
    });
  }, [data?.auction, playerRoles]);

  const teamCount = teams.length;
  const safeIndex = teamCount ? ((teamIndex % teamCount) + teamCount) % teamCount : 0;
  const team = teams[safeIndex] ?? null;

  const filledPlayers = useMemo(() => {
    if (!team) return [];
    const local = rosterByTeam[team.id] || [];
    const server = boardPlayersFromTeam(team, playerRoles, true);
    if (!local.length) return server;
    if (!server.length) return local;
    const byId = new Map(local.map((player) => [String(player.id), player]));
    for (const player of server) {
      const key = String(player.id);
      byId.set(key, byId.has(key) ? { ...byId.get(key), ...player } : player);
    }
    return Array.from(byId.values());
  }, [rosterByTeam, team, playerRoles]);

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
          variant="overlay"
          kicker="Team Squad Board"
        />
      </div>
    </div>
  );
}
