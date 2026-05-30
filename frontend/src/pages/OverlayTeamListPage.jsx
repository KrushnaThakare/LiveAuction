import { useSearchParams } from 'react-router-dom';
import { useOverlayRealtime } from '../hooks/useOverlayRealtime';
import { resolveUrl } from '../utils/resolveUrl';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

export default function OverlayTeamListPage() {
  const [params] = useSearchParams();
  const tid = params.get('tournamentId');
  const token = params.get('token');
  const { data, config } = useOverlayRealtime(tid, token);
  const teams = data?.teams || [];
  if (config && config.overlayShowTeamList === false) return null;

  return <div className="overlay-stage">
    <section className="overlay-panel">
      <h2>TEAM SQUADS</h2>
      {teams.map(t => {
        const spent = Number(t.budget || 0) - Number(t.remainingBudget || 0);
        return <div key={t.id} className="overlay-squad-row">
          <div className="overlay-squad-title">
            {t.logoUrl && <img className="overlay-team-logo" src={resolveUrl(t.logoUrl)} alt={t.name} />}
            <span>{t.name}</span>
            <span className="overlay-muted">Spent {money(spent)}</span>
          </div>
          <div className="overlay-squad-list">
            {(t.players || []).length ? (t.players || []).map(p => `${p.name} (${p.role})`).join(' • ') : 'No players bought yet'}
          </div>
        </div>;
      })}
    </section>
  </div>;
}
