import { useSearchParams } from 'react-router-dom';
import { useOverlayRealtime } from '../hooks/useOverlayRealtime';
import { resolveUrl } from '../utils/resolveUrl';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

export default function OverlayMainPage() {
  const [params] = useSearchParams();
  const tid = params.get('tournamentId');
  const token = params.get('token');
  const { data, config, connected } = useOverlayRealtime(tid, token);
  const auction = data?.auction;
  const player = auction?.currentPlayer;
  const teams = data?.teams || [];
  const team = teams.find(t => t.id === auction?.highestBidderTeamId);

  if (config && config.overlayEnabled === false) return null;

  return <div className="overlay-stage">
    {auction?.status === 'SOLD' && <div className="overlay-status">SOLD</div>}
    <section className="overlay-main-card">
      {player?.imageUrl ? (
        <img className="overlay-player-photo" src={resolveUrl(player.imageUrl)} alt={player.name} />
      ) : <div className="overlay-player-photo" />}
      <div>
        <div className="overlay-kicker">Live Auction {connected ? '●' : '○'}</div>
        <h1 className="overlay-player-name">{player?.name || 'Waiting for Player'}</h1>
        <div className="overlay-muted">{player?.role || 'Auction standby'}</div>
        <div className="overlay-price-row">
          <span className="overlay-pill">Base {money(player?.basePrice)}</span>
          <span className="overlay-pill bid">Bid {money(auction?.currentBid)}</span>
        </div>
        <div className="overlay-team-chip">
          {team?.logoUrl && <img className="overlay-team-logo" src={resolveUrl(team.logoUrl)} alt={team.name} />}
          {auction?.highestBidderTeamName || 'Awaiting first bid'}
        </div>
      </div>
    </section>
  </div>;
}
