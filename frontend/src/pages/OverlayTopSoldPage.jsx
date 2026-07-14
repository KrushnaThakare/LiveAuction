import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { overlayApi } from '../api/overlay';
import TopSoldBreakOverlay from '../components/overlay/TopSoldBreakOverlay';
import OverlayFullscreenButton from '../components/common/OverlayFullscreenButton';
import { getAuctionDisplayName } from '../utils/formatters';

/** Break-only OBS scene — fetches cached top 5 on load, no live auction WebSocket. */
export default function OverlayTopSoldPage() {
  const [params] = useSearchParams();
  const tid = params.get('tournamentId');
  const token = params.get('token');
  const [config, setConfig] = useState(null);
  const [players, setPlayers] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!tid) return undefined;
    let cancelled = false;
    setReady(false);

    Promise.all([
      overlayApi.getConfig(tid, token).catch(() => null),
      overlayApi.getTopSold(tid, token, 5).catch(() => null),
    ]).then(([configRes, topRes]) => {
      if (cancelled) return;
      setConfig(configRes?.data?.data || null);
      setPlayers(topRes?.data?.data || []);
      setReady(true);
    });

    return () => { cancelled = true; };
  }, [tid, token]);

  const tournamentName = getAuctionDisplayName(config, 'Auction');

  return (
    <div className="overlay-stage overlay-top-sold">
      <OverlayFullscreenButton />
      {!ready && (
        <div className="overlay-break-card" style={{ opacity: 0.85 }}>
          <div className="overlay-kicker">{tournamentName}</div>
          <h1>Top 5 Highest Sales</h1>
          <p>Loading…</p>
        </div>
      )}
      {ready && (
        <TopSoldBreakOverlay
          players={players}
          tournamentName={tournamentName}
          logoUrl={config?.logoUrl}
        />
      )}
    </div>
  );
}
