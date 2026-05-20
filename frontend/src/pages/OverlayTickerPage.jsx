import { useSearchParams } from 'react-router-dom';
import { useOverlayRealtime } from '../hooks/useOverlayRealtime';

export default function OverlayTickerPage() {
  const [params] = useSearchParams();
  const tid = params.get('tournamentId');
  const token = params.get('token');
  const { data, config } = useOverlayRealtime(tid, token);
  const a = data?.auction;
  if (config && config.overlayShowTicker === false) return null;
  const text = `${a?.highestBidderTeamName || 'No team'} bid ₹${a?.currentBid || 0} for ${a?.currentPlayer?.name || 'N/A'}`;
  return <div style={{background:'transparent',color:'white',position:'fixed',bottom:0,width:'100%',overflow:'hidden'}}>
    <div style={{whiteSpace:'nowrap',animation:'mar 15s linear infinite'}}>{text}</div>
    <style>{`@keyframes mar {0%{transform:translateX(100%)}100%{transform:translateX(-100%)}} body{margin:0;overflow:hidden}`}</style>
  </div>;
}
