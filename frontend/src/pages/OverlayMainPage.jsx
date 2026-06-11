import { useSearchParams } from 'react-router-dom';
import { Activity, BarChart3, Calendar, IndianRupee, Radio, Shield, Target, TrendingUp, Trophy, UserRound } from 'lucide-react';
import { useOverlayRealtime } from '../hooks/useOverlayRealtime';
import { resolveUrl } from '../utils/resolveUrl';
import { driveImg } from '../utils/driveImage';
import { playerIdLabel } from '../utils/playerSearch';
import { hasPlayerStats, statValue } from '../utils/playerStats';
import OverlayFullscreenButton from '../components/common/OverlayFullscreenButton';
import styles from './OverlayBroadcast.module.css';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

const roleLabel = (role) => ({
  BATSMAN: 'BATSMAN',
  BOWLER: 'BOWLER',
  ALL_ROUNDER: 'ALL ROUNDER',
  WICKET_KEEPER: 'WK',
}[role] || role || 'ROLE');

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

  if (config && config.overlayEnabled === false) return null;

  return (
    <div className={styles.stage}>
      <OverlayFullscreenButton />
      <PlayerStatsOverlay player={player} />
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
            <Stat icon={Shield} label="Role" value={roleLabel(player?.role)} />
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

        <div className={styles.bidPanel}>
          <div className={styles.liveBadge}>
            <Radio size={15} />
            LIVE BID
          </div>

          <div className={`${styles.glassCard} ${styles.amountCard}`}>
            <div className={styles.bidLabel}>Current Bid</div>
            <div className={styles.bidAmount}>
              {money(auction?.currentBid)}
            </div>
            <div className={styles.status}>{status === 'ACTIVE' ? 'Auction Active' : status}</div>
          </div>

          {(isSold || isUnsold) && (
            <div className={`${styles.glassCard} ${styles.resultStamp}`}>
              {isSold && <img src="/gavel.png" alt="" />}
              <span>{isSold ? 'SOLD' : 'UNSOLD'}</span>
            </div>
          )}

          <div className={`${styles.glassCard} ${styles.teamBid}`}>
            {team?.logoUrl ? (
              <img className={styles.teamLogo} src={resolveUrl(team.logoUrl)} alt={team.name} />
            ) : (
              <div className={`${styles.teamLogo} ${styles.teamLogoFallback}`}>
                {(auction?.highestBidderTeamName || 'A')[0]}
              </div>
            )}
            <div>
              <div className={styles.teamLabel}>Currently Bidding</div>
              <div className={styles.teamName}>{auction?.highestBidderTeamName || 'Awaiting Bidder'}</div>
            </div>
            <div className={styles.increment}>
              <TrendingUp size={18} />
              +{money(increment)}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
