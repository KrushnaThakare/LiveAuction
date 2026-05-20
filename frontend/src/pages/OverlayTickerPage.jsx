import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { overlayApi } from '../api/overlay';

export default function OverlayTickerPage() {
  const [params] = useSearchParams();
  const tid = params.get('tournamentId');
  const [text, setText] = useState('Waiting for updates...');
  useEffect(() => {
    if (!tid) return;
    const load = async () => {
      const a = (await overlayApi.getSnapshot(tid)).data.data.auction;
      setText(`${a?.highestBidderTeamName || 'No team'} bid ₹${a?.currentBid || 0} for ${a?.currentPlayer?.name || 'N/A'}`);
    };
    load();
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, [tid]);
  return <div style={{background:'transparent',color:'white',position:'fixed',bottom:0,width:'100%',overflow:'hidden'}}>
    <div style={{whiteSpace:'nowrap',animation:'mar 15s linear infinite'}}>{text}</div>
    <style>{`@keyframes mar {0%{transform:translateX(100%)}100%{transform:translateX(-100%)}} body{margin:0;overflow:hidden}`}</style>
  </div>;
}
