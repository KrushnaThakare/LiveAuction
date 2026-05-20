import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { overlayApi } from '../api/overlay';

function useOverlayData(tournamentId) {
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!tournamentId) return;
    let on = true;
    const load = async () => {
      const res = await overlayApi.getSnapshot(tournamentId);
      if (on) setData(res.data.data);
    };
    load();
    const id = setInterval(load, 3000);
    return () => { on = false; clearInterval(id); };
  }, [tournamentId]);
  return data;
}

export default function OverlayMainPage() {
  const [params] = useSearchParams();
  const tid = params.get('tournamentId');
  const data = useOverlayData(tid);
  const a = data?.auction;
  return <div style={{background:'transparent',color:'white',padding:20,minHeight:'100vh'}}>
    <h2>LIVE AUCTION</h2>
    <h1>{a?.currentPlayer?.name || 'Waiting...'}</h1>
    <p>Base: ₹{a?.currentPlayer?.basePrice || 0} | Current: ₹{a?.currentBid || 0}</p>
    <p>{a?.highestBidderTeamName || 'No bidder yet'}</p>
  </div>;
}
