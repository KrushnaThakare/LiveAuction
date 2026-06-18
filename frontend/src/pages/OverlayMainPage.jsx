import { useSearchParams } from 'react-router-dom';
import { Activity, BarChart3, Calendar, IndianRupee, Radio, Shield, Target, TrendingUp, Trophy, UserRound } from 'lucide-react';
import { useOverlayRealtime } from '../hooks/useOverlayRealtime';
import { useTimedPlayerStatsOverlay } from '../hooks/useTimedPlayerStatsOverlay';
import { resolveUrl } from '../utils/resolveUrl';
import { driveImg } from '../utils/driveImage';
import { playerIdLabel } from '../utils/playerSearch';
import { hasPlayerStats, statValue } from '../utils/playerStats';
import { getRoleShortLabel, formatSquadPickLabel } from '../utils/formatters';
import OverlayFullscreenButton from '../components/common/OverlayFullscreenButton';
import styles from './OverlayBroadcast.module.css';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

function Stat({ icon: Icon, label, value }) {
  return (
    <div className={`${styles.glassCard} ${styles.statCard}`}>
      <span className={styles.statIcon}><Icon size={17} /></span>
      <span>
        <span className={styles.statLabel}>{label}</span>
        <span className={styles.statValue}>{value}</span>
      </span>
    </div>
  );
}

function PlayerStatsOverlay({ player }) {
  if (!hasPlayerStats(player)) return null;
  const stats = [
    ['Matches', player.statsMatches, BarChart3],
    ['Runs', player.statsRuns, TrendingUp],
    ['Strike Rate', player.statsStrikeRate, Activity],
    ['Wickets', player.statsWickets, Target],
    ['Economy', player.statsEconomy, Shield],
    ['Average', player.statsAverage, Trophy],
  ];

  return (
    <aside className={styles.statsOverlayPanel}>
      <div className={styles.statsOverlayHeader}>
        <span>{player?.id ? playerIdLabel(player) : 'Player'} Stats</span>
        {player?.cricheroesPlayerId && <small>CRH #{player.cricheroesPlayerId}</small>}
      </div>
      <div className={styles.statsOverlayGrid}>
        {stats.map(([label, value, Icon]) => (
          <div key={label} className={styles.statsOverlayItem}>
            <Icon size={15} />
            <span>{label}</span>
            <strong>{statValue(value)}</strong>
          </div>
        ))}
      </div>
    </aside>
  );
}

export default function OverlayMainPage() {
  const [params] = useSearchParams();
  const tid = params.get('tournamentId');
  const token = params.get('token');
  const { data, config, connected } = useOverlayRealtime(tid, token);
  const auction = data?.auction;
  const player = auction?.currentPlayer;
  const teams = data?.teams || [];
  const team = teams.find(t => t.id === auction?.highestBidderTeamId || t.name === auction?.highestBidderTeamName);
  const increment = Math.max(0, Number(auction?.nextBidAmount || 0) - Number(auction?.currentBid || 0));
  const status = auction?.status || 'IDLE';
  const isSold = status === 'SOLD';
  const isUnsold = status === 'UNSOLD';
  const squadPickLabel = isSold ? formatSquadPickLabel(team?.playerCount) : null;
  const showStatsIntro = useTimedPlayerStatsOverlay(
    player,
    auction?.sessionId,
    config?.overlayShowPlayerStatsIntro !== false,
    config?.overlayPlayerStatsIntroMs || 5500
  );

  if (config && config.overlayEnabled === false) return null;

  const showVerdict = isSold || isUnsold;
  const verdictStampKey = showVerdict ? `${auction?.sessionId || 'session'}-${status}` : 'idle';

  return (
    <div className={styles.stage}>
      <OverlayFullscreenButton />
      {showStatsIntro && <PlayerStatsOverlay player={player} />}
      {showVerdict && (
        <div
          key={verdictStampKey}
          className={`${styles.verdictStampStrip} ${isSold ? styles.verdictStampSold : styles.verdictStampUnsold}`}
          aria-live="polite"
        >
          <div className={styles.verdictStampSeal}>
            <div className={styles.verdictStampRing} aria-hidden />
            <div className={styles.verdictStampBody}>
              <span className={styles.verdictStampKicker}>Official Auction Order</span>
              <span className={styles.verdictStampText}>{isSold ? 'SOLD' : 'UNSOLD'}</span>
              {isSold && squadPickLabel && (
                <span className={styles.verdictStampSquad}>
                  {squadPickLabel} · {auction?.highestBidderTeamName || team?.name}
                </span>
              )}
              <span className={styles.verdictStampFooter}>Verified &amp; Recorded</span>
            </div>
            <div className={styles.verdictStampImpact} aria-hidden />
          </div>
        </div>
      )}
      <section className={`${styles.auctionDock} ${isSold ? styles.soldResult : ''} ${isUnsold ? styles.unsoldResult : ''}`}>
        <div className={styles.infoStack}>
          <div className={`${styles.glassCard} ${styles.playerNameCard}`}>
            <div className={styles.eyebrow}>
              <span className={styles.liveDot} />
              {player?.id ? playerIdLabel(player) : 'Player Name'} {connected ? 'Live' : 'Syncing'}
            </div>
            <h1 className={styles.playerName}>{player?.name || 'Waiting for Player'}</h1>
          </div>

          <div className={styles.statsGrid}>
            <Stat icon={Shield} label="Role" value={getRoleShortLabel(player?.role, config?.playerRoles)} />
            <Stat icon={IndianRupee} label="Base Price" value={money(player?.basePrice)} />
            <Stat icon={Calendar} label="Age" value={player?.age || 'Auction Pool'} />
            <Stat icon={Trophy} label="History" value={player?.teamName || player?.stats || 'Fresh pick'} />
          </div>
        </div>

        <div className={styles.imageWrap}>
          {player?.imageUrl ? (
            <img className={styles.playerImage} src={driveImg(player.imageUrl) || resolveUrl(player.imageUrl)} alt={player.name} />
          ) : (
            <div className={styles.imageFallback}><UserRound size={96} /></div>
          )}
        </div>

        <div className={`${styles.bidPanel} ${showVerdict ? styles.bidPanelSoldLayout : ''}`}>
          {!showVerdict && (
            <div className={styles.liveBadge}>
              <Radio size={15} />
              LIVE BID
            </div>
          )}

          <div className={`${styles.glassCard} ${styles.amountCard}`}>
            <div className={styles.bidLabel}>Current Bid</div>
            <div className={styles.bidAmount}>
              {money(auction?.currentBid)}
            </div>
            <div className={styles.status}>{status === 'ACTIVE' ? 'Auction Active' : status}</div>
          </div>

          <div className={`${styles.glassCard} ${styles.teamBid} ${isSold ? styles.teamBidSold : ''}`}>
            {team?.logoUrl ? (
              <img className={styles.teamLogo} src={resolveUrl(team.logoUrl)} alt={team.name} />
            ) : (
              <div className={`${styles.teamLogo} ${styles.teamLogoFallback}`}>
                {(auction?.highestBidderTeamName || 'A')[0]}
              </div>
            )}
            <div>
              <div className={styles.teamLabel}>{isSold ? 'Winning Team' : 'Currently Bidding'}</div>
              <div className={styles.teamName}>
                {auction?.highestBidderTeamName || 'Awaiting Bidder'}
                {squadPickLabel && <span className={styles.squadPickBadge}>{squadPickLabel}</span>}
              </div>
            </div>
            {!isSold && (
              <div className={styles.increment}>
                <TrendingUp size={18} />
                +{money(increment)}
              </div>
            )}
            {isSold && (
              <div className={styles.soldAmount}>
                {money(auction?.currentBid)}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
