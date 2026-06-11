import { useSearchParams } from 'react-router-dom';
import { useOverlayRealtime } from '../hooks/useOverlayRealtime';
import OverlayFullscreenButton from '../components/common/OverlayFullscreenButton';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

export default function OverlayTickerPage() {
  const [params] = useSearchParams();
  const tid = params.get('tournamentId');
  const token = params.get('token');
  const { data, config } = useOverlayRealtime(tid, token);
  const auction = data?.auction;
  if (config && config.overlayShowTicker === false) return null;

  const text = auction?.status === 'SOLD'
    ? `${auction.highestBidderTeamName || 'A team'} bought ${auction.currentPlayer?.name || 'the player'} for ${money(auction.currentBid)}`
    : `${auction?.highestBidderTeamName || 'No team'} leading ${auction?.currentPlayer?.name || 'current player'} at ${money(auction?.currentBid)}`;

  return <div className="overlay-stage">
    <OverlayFullscreenButton />
    <div className="overlay-ticker"><div className="overlay-ticker-text">{text}</div></div>
  </div>;
}
