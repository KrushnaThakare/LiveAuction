import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { overlayApi } from '../api/overlay';

export default function OverlayTeamBudgetPage() {
  const [params] = useSearchParams();
  const tid = params.get('tournamentId');
  const [teams, setTeams] = useState([]);
  useEffect(() => {
    if (!tid) return;
    const load = async () => setTeams((await overlayApi.getSnapshot(tid)).data.data.teams || []);
    load();
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, [tid]);
  return <div style={{background:'transparent',color:'white',padding:20}}>
    <h2>TEAM BUDGET</h2>
    {teams.map(t => <div key={t.id}>{t.name} - ₹{t.remainingBudget} ({t.playerCount})</div>)}
  </div>;
}
