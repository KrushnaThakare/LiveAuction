import { memo, useEffect, useRef } from 'react';
import { resolveUrl } from '../../utils/resolveUrl';
import AnimatedNumber from './AnimatedNumber';
import SquadPlayerTile from './SquadPlayerTile';
import squadStyles from './AudienceSquad.module.css';

const money = (value) => `₹${Math.round(Number(value) || 0).toLocaleString('en-IN')}`;

function AudienceTeamSquadColumn({
  team,
  players,
  playerRoles,
  highlighted,
  newPlayerId,
  slotRef,
}) {
  const columnRef = useRef(null);

  useEffect(() => {
    if (!slotRef) return undefined;
    slotRef(team.id, columnRef.current);
    return () => slotRef(team.id, null);
  }, [team.id, slotRef]);

  const logoSrc = resolveUrl(team.logoUrl);

  return (
    <article
      ref={columnRef}
      className={`${squadStyles.teamColumn} ${highlighted ? squadStyles.teamColumnHighlight : ''}`}
    >
      <header className={squadStyles.teamHeader}>
        <div className={squadStyles.teamLogoWrap}>
          {logoSrc ? (
            <img src={logoSrc} alt="" className={squadStyles.teamLogo} />
          ) : (
            <span className={squadStyles.teamLogoFallback}>{team.name?.[0] || 'T'}</span>
          )}
        </div>
        <div className={squadStyles.teamInfo}>
          <h3 className={squadStyles.teamName}>{team.name}</h3>
          <div className={squadStyles.teamStats}>
            <span className={squadStyles.statLabel}>Budget</span>
            <AnimatedNumber
              value={team.remainingBudget}
              format={money}
              duration={700}
            />
          </div>
          <div className={squadStyles.teamStats}>
            <span className={squadStyles.statLabel}>Players</span>
            <AnimatedNumber
              value={players.length}
              format={(v) => String(Math.round(v))}
              duration={550}
            />
          </div>
        </div>
      </header>

      <div className={squadStyles.squadList}>
        {players.length === 0 ? (
          <div className={squadStyles.emptySlot}>—</div>
        ) : (
          players.map((player) => (
            <SquadPlayerTile
              key={player.id}
              player={player}
              playerRoles={playerRoles}
              isNew={player.id === newPlayerId}
            />
          ))
        )}
        <div className={squadStyles.dropAnchor} data-team-id={team.id} />
      </div>
    </article>
  );
}

export default memo(AudienceTeamSquadColumn, (prev, next) => (
  prev.team.id === next.team.id
  && prev.team.remainingBudget === next.team.remainingBudget
  && prev.highlighted === next.highlighted
  && prev.newPlayerId === next.newPlayerId
  && prev.players === next.players
  && prev.playerRoles === next.playerRoles
));
