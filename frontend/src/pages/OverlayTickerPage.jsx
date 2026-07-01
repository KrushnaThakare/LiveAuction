import { useSearchParams } from 'react-router-dom';
import { useOverlayRealtime } from '../hooks/useOverlayRealtime';
import { useOverlayBidPop } from '../hooks/useOverlayBidPop';
import OverlayFullscreenButton from '../components/common/OverlayFullscreenButton';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

export default function OverlayTickerPage() {
  const [params] = useSearchParams();
  const tid = params.get('tournamentId');
  const token = params.get('token');
  const { data, config } = useOverlayRealtime(tid, token, { studioOverlay: true });
  const auction = data?.auction;
  if (config && config.overlayShowTicker === false) return null;

  const bidPopEnabled = config?.overlayShowBidPop !== false;
  const bidPopToken = useOverlayBidPop(auction?.currentBid, auction?.sessionId, bidPopEnabled && auction?.status === 'ACTIVE');

  const text = auction?.status === 'SOLD'
    ? `${auction.highestBidderTeamName || 'A team'} bought ${auction.currentPlayer?.name || 'the player'} for ${money(auction.currentBid)}`
    : `${auction?.highestBidderTeamName || 'No team'} leading ${auction?.currentPlayer?.name || 'current player'} at ${money(auction?.currentBid)}`;

  return <div className="overlay-stage">
    <OverlayFullscreenButton />
    <div className="overlay-ticker">
      <div className={`overlay-ticker-text ${bidPopToken > 0 ? 'overlay-ticker-pop' : ''}`} key={bidPopToken}>{text}</div>
    </div>
  </div>;
}
