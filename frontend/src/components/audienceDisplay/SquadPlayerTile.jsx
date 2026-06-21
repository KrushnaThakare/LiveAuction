import { memo } from 'react';
import { UserRound } from 'lucide-react';
import { getRoleShortLabel } from '../../utils/formatters';
import squadStyles from './AudienceSquad.module.css';

function SquadPlayerTile({ player, playerRoles, isNew }) {
  return (
    <div className={`${squadStyles.playerTile} ${isNew ? squadStyles.playerTileNew : ''}`}>
      <div className={squadStyles.playerPhoto}>
        {player.imageUrl ? (
          <img src={player.imageUrl} alt={player.firstName} loading="lazy" />
        ) : (
          <span className={squadStyles.photoFallback}><UserRound size={14} /></span>
        )}
      </div>
      <div className={squadStyles.playerMeta}>
        <span className={squadStyles.playerName}>{player.firstName}</span>
        <span className={squadStyles.playerRole}>{getRoleShortLabel(player.role, playerRoles)}</span>
      </div>
    </div>
  );
}

export default memo(SquadPlayerTile);
