import { memo } from 'react';
import AudienceTeamSquadColumn from './AudienceTeamSquadColumn';
import squadStyles from './AudienceSquad.module.css';

function AudienceSquadRail({
  teams,
  squads,
  playerRoles,
  highlightTeamId,
  newPlayerId,
  slotRef,
}) {
  if (!teams.length) return null;

  return (
    <section className={squadStyles.rail} aria-label="Live squad build">
      <div className={squadStyles.railInner}>
        {teams.map((team) => (
          <AudienceTeamSquadColumn
            key={team.id}
            team={team}
            players={squads[team.id] || []}
            playerRoles={playerRoles}
            highlighted={highlightTeamId === team.id}
            newPlayerId={newPlayerId}
            slotRef={slotRef}
          />
        ))}
      </div>
    </section>
  );
}

export default memo(AudienceSquadRail);
