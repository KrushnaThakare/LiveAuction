import { Calendar, IndianRupee, Shield, Trophy, UserRound } from 'lucide-react';
import { resolveUrl } from '../../utils/resolveUrl';
import { driveImg } from '../../utils/driveImage';
import { playerIdLabel } from '../../utils/playerSearch';
import { getRoleShortLabel } from '../../utils/formatters';
import { useOverlayPlayerTransition } from '../../hooks/useOverlayPlayerTransition';
import styles from '../../pages/OverlayBroadcast.module.css';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

function Stat({ icon: Icon, label, value, enterClass = '' }) {
  return (
    <div className={`${styles.glassCard} ${styles.statCard} ${enterClass}`}>
      <span className={styles.statIcon}><Icon size={17} /></span>
      <span>
        <span className={styles.statLabel}>{label}</span>
        <span className={styles.statValue}>{value}</span>
      </span>
    </div>
  );
}

function PlayerPanelContent({
  player,
  connected,
  playerRoles,
  mode,
}) {
  const isEnter = mode === 'enter';

  return (
    <>
      <div className={styles.infoStack}>
        <div className={`${styles.glassCard} ${styles.playerNameCard}`}>
          <div className={styles.eyebrow}>
            <span className={styles.liveDot} />
            {player?.id ? playerIdLabel(player) : 'Player Name'} {connected ? 'Live' : 'Syncing'}
          </div>
          <h1 className={`${styles.playerName} ${isEnter ? styles.playerNameEnter : ''}`}>
            {player?.name || 'Waiting for Player'}
          </h1>
        </div>

        <div className={styles.statsGrid}>
          <Stat
            icon={Shield}
            label="Role"
            value={getRoleShortLabel(player?.role, playerRoles)}
            enterClass={isEnter ? styles.playerStatEnterRole : ''}
          />
          <Stat
            icon={IndianRupee}
            label="Base Price"
            value={money(player?.basePrice)}
            enterClass={isEnter ? styles.playerStatEnterBase : ''}
          />
          <Stat icon={Calendar} label="Age" value={player?.age || 'Auction Pool'} />
          <Stat icon={Trophy} label="History" value={player?.teamName || player?.stats || 'Fresh pick'} />
        </div>
      </div>

      <div className={`${styles.imageWrap} ${isEnter ? styles.playerPhotoEnter : ''}`}>
        {player?.imageUrl ? (
          <img
            className={styles.playerImage}
            src={driveImg(player.imageUrl) || resolveUrl(player.imageUrl)}
            alt={player?.name || 'Player'}
          />
        ) : (
          <div className={styles.imageFallback}><UserRound size={96} /></div>
        )}
      </div>
    </>
  );
}

export default function OverlayMainPlayerPanel({
  player,
  sessionId,
  transitionEnabled,
  connected,
  playerRoles,
}) {
  const { exitingPlayer, displayPlayer, isEntering } = useOverlayPlayerTransition(
    sessionId,
    player,
    transitionEnabled
  );

  return (
    <div className={styles.playerTransitionRoot}>
      {exitingPlayer && (
        <div className={`${styles.playerTransitionLayer} ${styles.playerExitLayer}`} aria-hidden="true">
          <PlayerPanelContent
            player={exitingPlayer}
            connected={connected}
            playerRoles={playerRoles}
            mode="exit"
          />
        </div>
      )}
      <div className={`${styles.playerTransitionLayer} ${isEntering ? styles.playerEnterLayer : ''}`}>
        <PlayerPanelContent
          player={displayPlayer}
          connected={connected}
          playerRoles={playerRoles}
          mode={isEntering ? 'enter' : 'idle'}
        />
      </div>
    </div>
  );
}
