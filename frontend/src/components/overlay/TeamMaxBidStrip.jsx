import { formatCurrency } from '../../utils/formatters';
import { maxBidInfoForTeam } from '../../utils/auctionConstraints';
import { resolveSquadSize } from '../../utils/squadFormation';
import styles from './TeamMaxBidStrip.module.css';

export default function TeamMaxBidStrip({ teams = [], auction, config }) {
  if (config?.overlayShowTeamMaxBid === false) return null;
  if (!teams?.length) return null;

  const squadSize = resolveSquadSize(config);
  return (
    <footer className={styles.strip} aria-label="Team max bids">
      <div className={styles.stripTitle}>Max bid</div>
      <div className={styles.stripGrid}>
        {(teams || []).map((team) => {
          const info = maxBidInfoForTeam(team, squadSize, auction);
          const full = info?.squadFull;
          const max = info?.maxBid ?? 0;
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
