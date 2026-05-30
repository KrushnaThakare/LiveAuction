import { useSearchParams } from 'react-router-dom';
import { useOverlayRealtime } from '../hooks/useOverlayRealtime';
import { resolveUrl } from '../utils/resolveUrl';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

export default function OverlayTeamBudgetPage() {
  const [params] = useSearchParams();
  const tid = params.get('tournamentId');
  const token = params.get('token');
  const { data, config } = useOverlayRealtime(tid, token);
  const teams = data?.teams || [];
  if (config && config.overlayShowTeamBudget === false) return null;

  return <div className="overlay-stage">
    <section className="overlay-panel">
      <h2>TEAM BUDGET</h2>
      {teams.map(t => <div key={t.id} className="overlay-row">
        {t.logoUrl ? <img className="overlay-team-logo" src={resolveUrl(t.logoUrl)} alt={t.name} /> : <span />}
        <span>{t.name}</span>
        <span>{money(t.remainingBudget)}</span>
        <span className="overlay-muted">{t.playerCount} players</span>
      </div>)}
    </section>
  </div>;
}
