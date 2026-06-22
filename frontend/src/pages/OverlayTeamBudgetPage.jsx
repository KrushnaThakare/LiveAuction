import { useSearchParams } from 'react-router-dom';
import { Gauge, Users } from 'lucide-react';
import { useOverlayRealtime } from '../hooks/useOverlayRealtime';
import { resolveUrl } from '../utils/resolveUrl';
import OverlayFullscreenButton from '../components/common/OverlayFullscreenButton';
import styles from './OverlayBroadcast.module.css';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

export default function OverlayTeamBudgetPage() {
  const [params] = useSearchParams();
  const tid = params.get('tournamentId');
  const token = params.get('token');
  const { data, config, connected } = useOverlayRealtime(tid, token);
  const teams = data?.teams || [];

  if (!data && !config) {
    return (
      <div className={styles.stage}>
        <div className={styles.boardTitle}>Connecting overlay…</div>
      </div>
    );
  }

  if (config && config.overlayShowTeamBudget === false) return null;

  return (
    <div className={styles.stage}>
      <OverlayFullscreenButton />
      <section className={styles.budgetBoard}>
        <div className={styles.boardTitle}>
          <span>Team Purse Scoreboard</span>
          <Gauge size={18} />
        </div>
        <div className={styles.budgetRows}>
          {teams.map(team => {
            const budget = Number(team.budget || 0);
            const remaining = Number(team.remainingBudget || 0);
            const pct = budget ? Math.max(0, Math.min(100, (remaining / budget) * 100)) : 0;

            return (
              <div key={team.id} className={styles.budgetRow}>
                {team.logoUrl ? (
                  <img className={styles.budgetLogo} src={resolveUrl(team.logoUrl)} alt={team.name} />
                ) : (
                  <div className={`${styles.budgetLogo} ${styles.teamLogoFallback}`}>{team.name?.[0]}</div>
                )}
                <div className={styles.budgetTeamName}>{team.name}</div>
                <div className={styles.money}>{money(remaining)}</div>
                <div className={styles.playersCount}><Users size={13} /> {team.playerCount}</div>
                <div className={styles.progressTrack}>
                  <div className={styles.progressFill} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
