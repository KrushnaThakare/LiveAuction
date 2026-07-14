import { useSearchParams } from 'react-router-dom';
import { useOverlayRealtime } from '../hooks/useOverlayRealtime';
import { driveImg } from '../utils/driveImage';
import { resolveUrl } from '../utils/resolveUrl';
import OverlayFullscreenButton from '../components/common/OverlayFullscreenButton';

export default function OverlayUnsoldPage() {
  const [params] = useSearchParams();
  const tid = params.get('tournamentId');
  const token = params.get('token');
  const { data, config } = useOverlayRealtime(tid, token, { studioOverlay: true });
  const player = data?.auction?.currentPlayer;

  return <div className="overlay-stage overlay-full-celebration unsold-bg">
    <OverlayFullscreenButton />
    {player?.imageUrl && <img className="overlay-unsold-player" src={driveImg(player.imageUrl) || resolveUrl(player.imageUrl)} alt={player.name} />}
    <div className="overlay-verdict-card unsold">
      <div className="overlay-kicker">Auction Result</div>
      <h1>UNSOLD</h1>
      <p>{player?.name || 'Player'} returns to the pool</p>
    </div>
  </div>;
}
