import { useSearchParams } from 'react-router-dom';
import { useOverlayRealtime } from '../hooks/useOverlayRealtime';
import OverlayFullscreenButton from '../components/common/OverlayFullscreenButton';
import { getAuctionDisplayName } from '../utils/formatters';

export default function OverlayBreakScreenPage() {
  const [params] = useSearchParams();
  const tid = params.get('tournamentId');
  const token = params.get('token');
  const { config } = useOverlayRealtime(tid, token, { studioOverlay: true });

  return <div className="overlay-stage overlay-break-screen">
    <OverlayFullscreenButton />
    <div className="overlay-break-card">
      <div className="overlay-kicker">{getAuctionDisplayName(config, 'Auction')}</div>
      <h1>We’ll Be Right Back</h1>
      <p>Stay tuned for the next player reveal</p>
      <div className="overlay-sponsor-strip">Sponsor Strip • Team Logos • Auction Desk</div>
    </div>
  </div>;
}
