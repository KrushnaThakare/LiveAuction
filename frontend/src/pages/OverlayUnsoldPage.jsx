import { useSearchParams } from 'react-router-dom';
import { useOverlayRealtime } from '../hooks/useOverlayRealtime';
import { resolveUrl } from '../utils/resolveUrl';

export default function OverlayUnsoldPage() {
  const [params] = useSearchParams();
  const tid = params.get('tournamentId');
  const token = params.get('token');
  const { data, config } = useOverlayRealtime(tid, token);
  const player = data?.auction?.currentPlayer;
  if (config && config.overlayEnabled === false) return null;

  return <div className="overlay-stage overlay-full-celebration unsold-bg">
    {player?.imageUrl && <img className="overlay-unsold-player" src={resolveUrl(player.imageUrl)} alt={player.name} />}
    <div className="overlay-verdict-card unsold">
      <div className="overlay-kicker">Auction Result</div>
      <h1>UNSOLD</h1>
      <p>{player?.name || 'Player'} returns to the pool</p>
    </div>
  </div>;
}
