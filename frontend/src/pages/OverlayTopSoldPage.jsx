import { useSearchParams } from 'react-router-dom';
import { useOverlayRealtime } from '../hooks/useOverlayRealtime';
import { useTopSoldReveal } from '../hooks/useTopSoldReveal';
import TopSoldBreakOverlay from '../components/overlay/TopSoldBreakOverlay';
import OverlayFullscreenButton from '../components/common/OverlayFullscreenButton';
import { getAuctionDisplayName } from '../utils/formatters';

export default function OverlayTopSoldPage() {
  const [params] = useSearchParams();
  const tid = params.get('tournamentId');
  const token = params.get('token');
  const { data, config } = useOverlayRealtime(tid, token, { studioOverlay: true });
  const auction = data?.auction;
  const { active, players } = useTopSoldReveal(auction, tid, token);
  const showReveal = Boolean(active);
  const tournamentName = getAuctionDisplayName(config, 'Auction');

  return (
    <div className="overlay-stage overlay-top-sold">
      <OverlayFullscreenButton />
      {!showReveal && (
        <div className="overlay-break-card" style={{ opacity: 0.85 }}>
          <div className="overlay-kicker">{tournamentName}</div>
          <h1>Top 5 Highest Sales</h1>
          <p>Waiting for break trigger from auction desk</p>
        </div>
      )}
      {showReveal && (
        <TopSoldBreakOverlay
          key={active.id}
          players={players}
          tournamentName={tournamentName}
          logoUrl={config?.logoUrl}
        />
      )}
    </div>
  );
}
