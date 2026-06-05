import { useSearchParams } from 'react-router-dom';
import { Radio, UserRound } from 'lucide-react';
import { useOverlayRealtime } from '../hooks/useOverlayRealtime';
import { resolveUrl } from '../utils/resolveUrl';
import { driveImg } from '../utils/driveImage';
import { playerIdLabel } from '../utils/playerSearch';
import styles from './AuctionDisplay.module.css';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

const roleLabel = (role) => ({
  BATSMAN: 'BAT',
  BOWLER: 'BOWL',
  ALL_ROUNDER: 'AR',
  WICKET_KEEPER: 'WK',
}[role] || role || 'ROLE');

export default function AuctionDisplayPage() {
  const [params] = useSearchParams();
  const tid = params.get('tournamentId');
  const token = params.get('token');
  const title = params.get('title') || 'Cricket Auction Live';
  const sponsor = params.get('sponsor') || 'Premium Auction Arena';
  const { data, connected } = useOverlayRealtime(tid, token);
  const auction = data?.auction;
  const player = auction?.currentPlayer;
  const teams = data?.teams || [];
  const team = teams.find(t => t.id === auction?.highestBidderTeamId || t.name === auction?.highestBidderTeamName);
  const status = auction?.status || 'IDLE';
  const liveText = status === 'ACTIVE' ? 'Auction Live' : status === 'SOLD' ? 'Sold' : status === 'UNSOLD' ? 'Unsold' : 'Auction Standby';
  const isResult = status === 'SOLD' || status === 'UNSOLD';

  return (
    <main className={`${styles.screen} ${isResult ? styles.resultMode : ''} ${status === 'UNSOLD' ? styles.unsoldMode : ''}`}>
      <div className={styles.shell}>
        <header className={styles.topBar}>
          <div>
            <div className={styles.brandKicker}>{connected ? 'Live Sync Connected' : 'Connecting Live Feed'}</div>
            <div className={styles.title}>{title}</div>
          </div>
          <div className={styles.sponsor}>{sponsor}</div>
        </header>

        <section className={styles.mainGrid}>
          <aside className={styles.detailsPanel}>
            <div className={`${styles.glass} ${styles.playerNameCard}`}>
              <div className={styles.label}>{player?.id ? playerIdLabel(player) : 'Player On Auction'}</div>
              <h1 className={styles.playerName}>{player?.name || 'Waiting for Player'}</h1>
            </div>
            <div className={styles.detailGrid}>
              <div className={`${styles.glass} ${styles.detailCard}`}>
                <div className={styles.label}>Category</div>
                <div className={styles.value}>{player?.category || player?.teamName || 'Open Pool'}</div>
              </div>
              <div className={`${styles.glass} ${styles.detailCard}`}>
                <div className={styles.label}>Role</div>
                <div className={styles.value}>{roleLabel(player?.role)}</div>
              </div>
              <div className={`${styles.glass} ${styles.detailCard}`}>
                <div className={styles.label}>Base Price</div>
                <div className={styles.value}>{money(player?.basePrice)}</div>
              </div>
              <div className={`${styles.glass} ${styles.detailCard}`}>
                <div className={styles.label}>Age</div>
                <div className={styles.value}>{player?.age || 'Auction Pool'}</div>
              </div>
            </div>
          </aside>

          <div className={styles.imageFrame}>
            {player?.imageUrl ? (
              <img className={styles.playerImage} src={driveImg(player.imageUrl) || resolveUrl(player.imageUrl)} alt={player.name} />
            ) : (
              <div className={styles.imageFallback}><UserRound size={150} /></div>
            )}
          </div>

          <aside className={styles.bidPanel}>
            <div className={`${styles.glass} ${styles.bidCard}`}>
              <div className={styles.label}>Current Bid</div>
              <div className={styles.bidAmount}>
                {money(auction?.currentBid)}
              </div>
            </div>

            <div className={`${styles.glass} ${styles.teamCard}`}>
              {team?.logoUrl ? (
                <img className={styles.teamLogo} src={resolveUrl(team.logoUrl)} alt={team.name} />
              ) : (
                <div className={`${styles.teamLogo} ${styles.logoFallback}`}>
                  {(auction?.highestBidderTeamName || 'A')[0]}
                </div>
              )}
              <div>
                <div className={styles.label}>Currently Bidding</div>
                <div className={styles.teamName}>{auction?.highestBidderTeamName || 'Awaiting Bid'}</div>
              </div>
            </div>
          </aside>
        </section>

        <footer className={styles.statusBar}>
          <div className={styles.livePill}><span className={styles.dot} /> {status}</div>
          <div className={styles.statusText}><Radio size={34} /> {liveText}</div>
          <div className={styles.nextBid}>Next: {money(auction?.nextBidAmount)}</div>
        </footer>
      </div>

      {isResult && (
        <section className={styles.resultLayer}>
          <div className={styles.resultBursts} />
          <div className={styles.resultCard}>
            <div className={styles.resultKicker}>Auction Result</div>
            <div className={styles.resultTitle}>{status}</div>
            <div className={styles.resultPlayer}>{player?.name || 'Player'}</div>
            {status === 'SOLD' ? (
              <>
                <div className={styles.resultTeam}>
                  {team?.logoUrl && <img src={resolveUrl(team.logoUrl)} alt={team.name} />}
                  <span>{auction?.highestBidderTeamName || 'Winning Team'}</span>
                </div>
                <div className={styles.resultAmount}>{money(auction?.currentBid)}</div>
              </>
            ) : (
              <div className={styles.resultSubcopy}>Returns to the auction pool</div>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
