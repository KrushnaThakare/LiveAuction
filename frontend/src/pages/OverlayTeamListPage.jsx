import { useSearchParams } from 'react-router-dom';
import { Users } from 'lucide-react';
import { useOverlayRealtime } from '../hooks/useOverlayRealtime';
import { resolveUrl } from '../utils/resolveUrl';
import OverlayFullscreenButton from '../components/common/OverlayFullscreenButton';
import { getRoleShortLabel } from '../utils/formatters';
import styles from './OverlayBroadcast.module.css';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

export default function OverlayTeamListPage() {
  const [params] = useSearchParams();
  const tid = params.get('tournamentId');
  const token = params.get('token');
  const { data, config } = useOverlayRealtime(tid, token, { includePlayers: true });
  const teams = data?.teams || [];

  if (!data && !config) {
    return (
      <div className={`${styles.stage} ${styles.squadStage}`}>
        <div className={styles.boardTitle}>Connecting squad overlay…</div>
      </div>
    );
  }

  if (config && config.overlayShowTeamList === false) return null;

  return (
    <div className={`${styles.stage} ${styles.squadStage}`}>
      <OverlayFullscreenButton />
      <div className={styles.squadGrid}>
        {teams.map(team => {
          const players = team.players || [];
          return (
            <section key={team.id} className={styles.squadCard}>
              <header className={styles.squadHeader}>
                {team.logoUrl ? (
                  <img className={styles.squadLogo} src={resolveUrl(team.logoUrl)} alt={team.name} />
                ) : (
                  <div className={`${styles.squadLogo} ${styles.teamLogoFallback}`}>{team.name?.[0]}</div>
                )}
                <div className={styles.squadTeam}>{team.name}</div>
                <div className={styles.squadCount}><Users size={13} /> {players.length}</div>
              </header>

              <div className={styles.squadRows}>
                <div className={`${styles.squadRowsInner} ${players.length >= 6 ? styles.scrolling : ''}`}>
                  {players.length ? players.map(player => (
                    <div key={player.id} className={styles.playerRow}>
                      <span>{player.name}</span>
                      <span className={styles.roleBadge}>{getRoleShortLabel(player.role, config?.playerRoles)}</span>
                      <span className={styles.rowPrice}>{money(player.currentBid || player.basePrice)}</span>
                    </div>
                  )) : (
                    <div className={styles.playerRow}>
                      <span>Squad slots open</span>
                      <span className={styles.roleBadge}>LIVE</span>
                      <span className={styles.rowPrice}>{money(team.remainingBudget)}</span>
                    </div>
                  )}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
