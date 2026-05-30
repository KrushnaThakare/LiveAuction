import { useSearchParams } from 'react-router-dom';
import { useOverlayRealtime } from '../hooks/useOverlayRealtime';

export default function OverlayBreakScreenPage() {
  const [params] = useSearchParams();
  const tid = params.get('tournamentId');
  const token = params.get('token');
  const { config } = useOverlayRealtime(tid, token);
  if (config && config.overlayEnabled === false) return null;

  return <div className="overlay-stage overlay-break-screen">
    <div className="overlay-break-card">
      <div className="overlay-kicker">Cricket Auction</div>
      <h1>We’ll Be Right Back</h1>
      <p>Stay tuned for the next player reveal</p>
      <div className="overlay-sponsor-strip">Sponsor Strip • Team Logos • Auction Desk</div>
    </div>
  </div>;
}
