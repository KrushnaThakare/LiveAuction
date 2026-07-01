import { Calendar, IndianRupee, Shield, Trophy, UserRound } from 'lucide-react';
import { resolveUrl } from '../../utils/resolveUrl';
import { driveImg } from '../../utils/driveImage';
import { playerIdLabel } from '../../utils/playerSearch';
import { getRoleShortLabel } from '../../utils/formatters';
import { MAIN_OVERLAY_STAT_SLOTS, resolvePlayerDetailSlots } from '../../utils/playerDisplayExtras';
import { useOverlayPlayerTransition } from '../../hooks/useOverlayPlayerTransition';
import styles from '../../pages/OverlayBroadcast.module.css';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

function Stat({ icon: Icon, label, value, enterClass = '', valueClamp = false }) {
  return (
    <div className={`${styles.glassCard} ${styles.statCard} ${enterClass}`}>
      <span className={styles.statIcon}><Icon size={17} /></span>
      <span className={styles.statText}>
        <span className={styles.statLabel}>{label}</span>
        <span
          className={`${styles.statValue} ${valueClamp ? styles.statValueClamp : ''}`}
          title={valueClamp ? value : undefined}
        >
          {value}
        </span>
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
  const [ageSlot, historySlot] = resolvePlayerDetailSlots(player, MAIN_OVERLAY_STAT_SLOTS);

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
          <Stat icon={Calendar} label={ageSlot.label} value={ageSlot.value} valueClamp />
          <Stat icon={Trophy} label={historySlot.label} value={historySlot.value} valueClamp />
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
