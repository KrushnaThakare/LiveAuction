import { useSearchParams } from 'react-router-dom';
import { useOverlayRealtime } from '../hooks/useOverlayRealtime';

export default function OverlayMainPage() {
  const [params] = useSearchParams();
  const tid = params.get('tournamentId');
  const token = params.get('token');
  const { data, config, connected } = useOverlayRealtime(tid, token);
  const a = data?.auction;
  if (config && config.overlayEnabled === false) return null;
  return <div style={{background:'transparent',color:'white',padding:20,minHeight:'100vh'}}>
    <h2>LIVE AUCTION {connected ? "●" : "○"}</h2>
    <h1>{a?.currentPlayer?.name || 'Waiting...'}</h1>
    <p>Base: ₹{a?.currentPlayer?.basePrice || 0} | Current: ₹{a?.currentBid || 0}</p>
    <p>{a?.highestBidderTeamName || 'No bidder yet'}</p>
  </div>;
}
