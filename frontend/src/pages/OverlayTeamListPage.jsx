import { useSearchParams } from 'react-router-dom';
import { useOverlayRealtime } from '../hooks/useOverlayRealtime';

export default function OverlayTeamListPage() {
  const [params] = useSearchParams();
  const tid = params.get('tournamentId');
  const token = params.get('token');
  const { data, config } = useOverlayRealtime(tid, token);
  const teams = data?.teams || [];
  if (config && config.overlayShowTeamList === false) return null;
  return <div style={{background:'transparent',color:'white',padding:20}}>
    <h2>TEAM LIST</h2>
    {teams.map(t => <div key={t.id}><strong>{t.name}</strong>: {(t.players||[]).map(p=>p.name).join(', ')}</div>)}
  </div>;
}
