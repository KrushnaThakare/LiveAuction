import { useSearchParams } from 'react-router-dom';
import { useOverlayRealtime } from '../hooks/useOverlayRealtime';
import { resolveUrl } from '../utils/resolveUrl';
import OverlayFullscreenButton from '../components/common/OverlayFullscreenButton';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

export default function OverlaySoldPage() {
  const [params] = useSearchParams();
  const tid = params.get('tournamentId');
  const token = params.get('token');
  const { data, config } = useOverlayRealtime(tid, token, { studioOverlay: true });
  const auction = data?.auction;
  const teams = data?.teams || [];
  const team = teams.find(t => t.name === auction?.highestBidderTeamName || t.id === auction?.highestBidderTeamId);

  return <div className="overlay-stage overlay-full-celebration">
    <OverlayFullscreenButton />
    <div className="overlay-confetti" />
    <div className="overlay-verdict-card sold">
      <div className="overlay-kicker">Final Hammer</div>
      <h1>PLAYER SOLD</h1>
      <p>{auction?.currentPlayer?.name || 'Player'} joins {auction?.highestBidderTeamName || 'Winning Team'}</p>
      {team?.logoUrl && <img className="overlay-verdict-logo" src={resolveUrl(team.logoUrl)} alt={team.name} />}
      <div className="overlay-verdict-amount">{money(auction?.currentBid)}</div>
    </div>
  </div>;
}
