import { formatCurrency } from '../../utils/formatters';
import { maxAllowedBid, isSquadFull } from '../../utils/auctionConstraints';
import { resolveSquadSize } from '../../utils/squadFormation';
import styles from './TeamMaxBidStrip.module.css';

export default function TeamMaxBidStrip({ teams = [], auction, config }) {
  if (auction?.status !== 'ACTIVE' || !auction?.currentPlayer) return null;
  if (config?.overlayShowTeamMaxBid === false) return null;

  const squadSize = resolveSquadSize(config);
  const basePrice = Number(auction.currentPlayer?.basePrice) || 0;
  const playerTag = auction.currentPlayer?.name?.split(/\s+/)[0] || 'Player';

  return (
    <footer className={styles.strip} aria-label="Team max bids">
      <div className={styles.stripTitle}>Max bid · {playerTag}</div>
      <div className={styles.stripGrid}>
        {(teams || []).map((team) => {
          const full = isSquadFull(team, squadSize);
          const max = maxAllowedBid(team, squadSize, basePrice);
          return (
            <div key={team.id} className={styles.chip}>
              <span className={styles.chipName}>{team.name}</span>
              <span className={styles.chipValue}>{full ? 'Full' : formatCurrency(max)}</span>
            </div>
          );
        })}
      </div>
    </footer>
  );
}
