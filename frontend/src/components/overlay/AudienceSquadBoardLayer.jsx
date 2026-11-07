import { useCallback, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import SquadBoardPanel from './SquadBoardPanel';
import { maxBidInfoForTeam } from '../../utils/auctionConstraints';
import { useSquadBoardRoster } from '../../hooks/useSquadBoardRoster';
import { resolveSquadSize } from '../../utils/squadFormation';
import squadStyles from '../../pages/OverlayTeamSquadBoard.module.css';

export default function AudienceSquadBoardLayer({
  teams,
  config,
  auction,
  teamIndex,
  setTeamIndex,
}) {
  const squadSize = resolveSquadSize(config);
  const playerRoles = config?.playerRoles;
  const { filledForTeam } = useSquadBoardRoster(teams, playerRoles, auction);
  const [visible, setVisible] = useState(true);

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
    return {
      show: true,
      maxBid: info.maxBid,
      squadFull: info.squadFull,
    };
  }, [team, auction, squadSize]);

  const goTo = useCallback((nextIndex) => {
    if (!teamCount) return;
    setVisible(false);
    window.setTimeout(() => {
      setTeamIndex(((nextIndex % teamCount) + teamCount) % teamCount);
      setVisible(true);
    }, 160);
  }, [setTeamIndex, teamCount]);

  const goNext = useCallback(() => goTo(safeIndex + 1), [goTo, safeIndex]);
  const goPrev = useCallback(() => goTo(safeIndex - 1), [goTo, safeIndex]);

  if (!team) return null;

  return (
    <div className={squadStyles.stage} style={{ position: 'fixed', inset: 0, zIndex: 25 }}>
      <div className={squadStyles.backdrop} />
      <div className={`${squadStyles.boardWrap} ${visible ? squadStyles.boardVisible : squadStyles.boardHidden}`}>
        <SquadBoardPanel
          team={team}
          filledPlayers={filledPlayers}
          squadSize={squadSize}
          showPrices
          showNextSlot
          variant="overlay"
          kicker="Audience · Team Squad"
          maxBidInfo={maxBidInfo}
        />
      </div>
      {teamCount > 1 && (
        <>
          <button type="button" className={`${squadStyles.navBtn} ${squadStyles.navLeft}`} onClick={goPrev} aria-label="Previous team">
            <ChevronLeft size={42} />
          </button>
          <button type="button" className={`${squadStyles.navBtn} ${squadStyles.navRight}`} onClick={goNext} aria-label="Next team">
            <ChevronRight size={42} />
          </button>
        </>
      )}
    </div>
  );
}
