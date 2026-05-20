import { useSearchParams } from 'react-router-dom';
import { useOverlayRealtime } from '../hooks/useOverlayRealtime';

export default function OverlayTeamBudgetPage() {
  const [params] = useSearchParams();
  const tid = params.get('tournamentId');
  const token = params.get('token');
  const { data, config } = useOverlayRealtime(tid, token);
  const teams = data?.teams || [];
  if (config && config.overlayShowTeamBudget === false) return null;
  return <div style={{background:'transparent',color:'white',padding:20}}>
    <h2>TEAM BUDGET</h2>
    {teams.map(t => <div key={t.id}>{t.name} - ₹{t.remainingBudget} ({t.playerCount})</div>)}
  </div>;
}
