import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Activity, BarChart3, Radio, Shield, Target, TrendingUp, Trophy, UserRound } from 'lucide-react';
import { useOverlayRealtime } from '../hooks/useOverlayRealtime';
import { useTimedPlayerStatsOverlay } from '../hooks/useTimedPlayerStatsOverlay';
import { useCinematicPlayerIntro } from '../hooks/useCinematicPlayerIntro';
import { useOverlayBidPop } from '../hooks/useOverlayBidPop';
import { resolveUrl } from '../utils/resolveUrl';
import { driveImg } from '../utils/driveImage';
import { playerIdLabel } from '../utils/playerSearch';
import { hasPlayerStats, statValue } from '../utils/playerStats';
import { AUDIENCE_DETAIL_SLOTS, buildDetailSlotDefs, resolvePlayerDetailSlots } from '../utils/playerDisplayExtras';
import { getAuctionDisplayName, getRoleShortLabel, formatSquadPickLabel } from '../utils/formatters';
import OverlayFullscreenButton from '../components/common/OverlayFullscreenButton';
import GavelOverlay from '../components/common/GavelOverlay';
import CinematicPlayerIntro from '../components/overlay/CinematicPlayerIntro';
import RecordBreakOverlay from '../components/overlay/RecordBreakOverlay';
import TournamentCountdownOverlay from '../components/overlay/TournamentCountdownOverlay';
import SquadFormationCeremony from '../components/overlay/SquadFormationCeremony';
import BidAmountDisplay from '../components/overlay/BidAmountDisplay';
import { useAuctionVerdictOverlay } from '../hooks/useAuctionVerdictOverlay';
import { useAudienceCountdown } from '../hooks/useAudienceCountdown';
import { useSquadFormationCeremony } from '../hooks/useSquadFormationCeremony';
import { CINEMATIC_INTRO_MS } from '../constants/cinematicIntroTiming';
import { resolveSquadSize } from '../utils/squadFormation';
import styles from './AuctionDisplay.module.css';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

function PlayerStatsPanel({ player }) {
  if (!hasPlayerStats(player)) return null;
  const stats = [
    ['Matches', player.statsMatches, BarChart3],
    ['Runs', player.statsRuns, TrendingUp],
    ['Strike Rate', player.statsStrikeRate, Activity],
    ['Wickets', player.statsWickets, Target],
    ['Economy', player.statsEconomy, Shield],
    ['Average', player.statsAverage, Trophy],
  ];

  return (
    <div className={`${styles.glass} ${styles.statsPanel}`}>
      <div className={styles.statsTitle}>{player?.id ? playerIdLabel(player) : 'Player'} Stats</div>
      <div className={styles.statsPanelGrid}>
        {stats.map(([label, value, Icon]) => (
          <div key={label} className={styles.statsPanelItem}>
            <Icon size={18} />
            <span>{label}</span>
            <strong>{statValue(value)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AuctionDisplayPage() {
  const [params] = useSearchParams();
  const tid = params.get('tournamentId');
  const token = params.get('token');
  const sponsor = params.get('sponsor') || 'Premium Auction Arena';
  const [includePlayers, setIncludePlayers] = useState(false);
  const { data, config, connected, transport } = useOverlayRealtime(tid, token, { includePlayers, studioOverlay: true });
  const ceremonyEnabled = config?.overlayShowSquadFormation === true;
  const squadSize = resolveSquadSize(config);

  useEffect(() => {
    if (ceremonyEnabled) {
      setIncludePlayers(true);
    }
  }, [ceremonyEnabled]);
  const title = params.get('title') || getAuctionDisplayName(config, 'Auction Live');
  const auction = data?.auction;
  const player = auction?.currentPlayer;
  const teams = data?.teams || [];
  const team = teams.find(t => t.id === auction?.highestBidderTeamId || t.name === auction?.highestBidderTeamName);
  const status = auction?.status || 'IDLE';
  const liveText = status === 'ACTIVE' ? 'Auction Live' : status === 'SOLD' ? 'Sold' : status === 'UNSOLD' ? 'Unsold' : 'Auction Standby';
  const isResult = status === 'SOLD' || status === 'UNSOLD';
  const isSold = status === 'SOLD';
  const squadPickLabel = isSold ? formatSquadPickLabel(team?.playerCount) : null;
  const { soldOverlay, dismissOverlay } = useAuctionVerdictOverlay(auction, teams);
  const recordBreakEnabled = config?.overlayShowRecordBreak !== false;
  const [recordBreakDone, setRecordBreakDone] = useState(false);
  const needsRecordBreak = soldOverlay?.verdict === 'SOLD'
    && soldOverlay?.isRecord
    && recordBreakEnabled;

  useEffect(() => {
    setRecordBreakDone(false);
  }, [soldOverlay?.sessionKey]);

  const showRecordBreak = Boolean(soldOverlay && needsRecordBreak && !recordBreakDone);
  const showGavel = Boolean(soldOverlay && !showRecordBreak);

  const {
    active: ceremonyActive,
    phase: ceremonyPhase,
    teamRoster,
    flyRequest,
    activeTeamId,
    saleSummary,
    newPlayerKey,
    sourceRef,
    registerNextSlot,
    beginCeremony,
    completeFly,
    flyDurationMs,
    exitDurationMs,
  } = useSquadFormationCeremony(ceremonyEnabled, teams, config?.playerRoles, squadSize);

  const handleGavelComplete = useCallback(() => {
    if (ceremonyEnabled && soldOverlay?.verdict === 'SOLD') {
      beginCeremony(soldOverlay);
    }
    dismissOverlay();
  }, [beginCeremony, ceremonyEnabled, dismissOverlay, soldOverlay]);

  const handleRecordBreakComplete = useCallback(() => {
    setRecordBreakDone(true);
  }, []);

  const { active: countdownActive, dismiss: dismissCountdown } = useAudienceCountdown(auction);
  const [introForceKey, setIntroForceKey] = useState(0);

  const handleCountdownComplete = useCallback(() => {
    dismissCountdown();
    if (config?.overlayShowCinematicIntro === true && auction?.cinematicIntroLive !== false && player) {
      setIntroForceKey((k) => k + 1);
    }
  }, [auction?.cinematicIntroLive, config?.overlayShowCinematicIntro, dismissCountdown, player]);

  const showResultLayer = isResult && !soldOverlay && !ceremonyActive;
  const ceremonyTeam = teams.find((t) => t.id === activeTeamId);
  const cinematicEnabled = config?.overlayShowCinematicIntro === true && auction?.cinematicIntroLive !== false;
  const bidPopEnabled = config?.overlayShowBidPop !== false;
  const bidPopToken = useOverlayBidPop(auction?.currentBid, auction?.sessionId, bidPopEnabled && status === 'ACTIVE');
  const { isPlaying: cinematicPlaying, sessionReady } = useCinematicPlayerIntro(
    auction?.sessionId,
    status,
    cinematicEnabled,
    CINEMATIC_INTRO_MS,
    introForceKey,
  );
  const showStatsIntro = useTimedPlayerStatsOverlay(
    player,
    auction?.sessionId,
    config?.overlayShowPlayerStatsIntro !== false && sessionReady,
    config?.overlayPlayerStatsIntroMs || 5500
  );
  const [categorySlot, ageSlot] = resolvePlayerDetailSlots(
    player,
    buildDetailSlotDefs(config?.overlayAudienceDetailFields, AUDIENCE_DETAIL_SLOTS),
  );

  return (
    <main className={`${styles.screen} ${isResult ? styles.resultMode : ''} ${status === 'UNSOLD' ? styles.unsoldMode : ''} ${cinematicPlaying ? styles.cinematicMode : ''}`}>
      <OverlayFullscreenButton />
      <div className={`${styles.shell} ${cinematicPlaying ? styles.shellDuringCinematic : ''}`}>
        <header className={styles.topBar}>
          <div>
            <div className={styles.brandKicker}>
              {transport === 'websocket' || connected ? 'Live Sync Connected' : transport === 'polling' ? 'Polling Feed (check WebSocket)' : 'Connecting Live Feed'}
            </div>
            <div className={styles.title}>{title}</div>
          </div>
          <div className={styles.sponsor}>{sponsor}</div>
        </header>

        <section className={styles.mainGrid}>
          <aside className={styles.detailsPanel}>
            <div className={`${styles.glass} ${styles.playerNameCard}`}>
              <div className={styles.label}>{player?.id ? playerIdLabel(player) : 'Player On Auction'}</div>
              <h1 className={styles.playerName}>{player?.name || 'Waiting for Player'}</h1>
            </div>
            <div className={styles.detailGrid}>
              <div className={`${styles.glass} ${styles.detailCard}`}>
                <div className={styles.label}>{categorySlot.label}</div>
                <div className={`${styles.value} ${styles.valueClamp}`} title={categorySlot.value}>{categorySlot.value}</div>
              </div>
              <div className={`${styles.glass} ${styles.detailCard}`}>
                <div className={styles.label}>Role</div>
                <div className={styles.value}>{getRoleShortLabel(player?.role, config?.playerRoles)}</div>
              </div>
              <div className={`${styles.glass} ${styles.detailCard}`}>
                <div className={styles.label}>Base Price</div>
                <div className={styles.value}>{money(player?.basePrice)}</div>
              </div>
              <div className={`${styles.glass} ${styles.detailCard}`}>
                <div className={styles.label}>{ageSlot.label}</div>
                <div className={`${styles.value} ${styles.valueClamp}`} title={ageSlot.value}>{ageSlot.value}</div>
              </div>
            </div>
          </aside>

          <div className={styles.imageFrame}>
            {player?.imageUrl ? (
              <img className={styles.playerImage} src={driveImg(player.imageUrl) || resolveUrl(player.imageUrl)} alt={player.name} />
            ) : (
              <div className={styles.imageFallback}><UserRound size={150} /></div>
            )}
          </div>

          <aside className={styles.bidPanel}>
            <div className={`${styles.glass} ${styles.bidCard}`}>
              <div className={styles.label}>Current Bid</div>
              <BidAmountDisplay
                className={styles.bidAmount}
                amount={auction?.currentBid}
                formatAmount={money}
                popToken={bidPopToken}
              />
            </div>

            <div className={`${styles.glass} ${styles.teamCard} ${isSold ? styles.teamCardSold : ''}`}>
              {team?.logoUrl ? (
                <img className={styles.teamLogo} src={resolveUrl(team.logoUrl)} alt={team.name} />
              ) : (
                <div className={`${styles.teamLogo} ${styles.logoFallback}`}>
                  {(auction?.highestBidderTeamName || 'A')[0]}
                </div>
              )}
              <div>
                <div className={styles.label}>{isSold ? 'Winning Team' : 'Currently Bidding'}</div>
                <div className={styles.teamName}>
                  {auction?.highestBidderTeamName || 'Awaiting Bid'}
                  {squadPickLabel && <span className={styles.squadPickBadge}>{squadPickLabel}</span>}
                </div>
              </div>
            </div>

            {showStatsIntro && <PlayerStatsPanel player={player} />}
          </aside>
        </section>

        <footer className={styles.statusBar}>
          <div className={styles.livePill}><span className={styles.dot} /> {status}</div>
          <div className={styles.statusText}><Radio size={34} /> {liveText}</div>
          <div className={styles.nextBid}>Next: {money(auction?.nextBidAmount)}</div>
        </footer>
      </div>

      {showResultLayer && (
        <section className={styles.resultLayer}>
          <div className={`${styles.resultBursts} ${status === 'UNSOLD' ? styles.unsoldBursts : ''}`} />
          <div className={styles.resultCard}>
            <div className={styles.resultKicker}>Auction Result</div>
            <div className={styles.resultTitle}>{status}</div>
            <div className={styles.resultPlayer}>{player?.name || 'Player'}</div>
            {status === 'SOLD' ? (
              <>
                <div className={styles.resultTeam}>
                  {team?.logoUrl ? (
                    <img className={styles.resultTeamLogo} src={resolveUrl(team.logoUrl)} alt={team.name} />
                  ) : (
                    <div className={styles.resultTeamLogoFallback}>
                      {(auction?.highestBidderTeamName || 'W')[0]}
                    </div>
                  )}
                  <span>
                    {auction?.highestBidderTeamName || 'Winning Team'}
                    {squadPickLabel && <small className={styles.resultSquadPick}>{squadPickLabel} in Squad</small>}
                  </span>
                </div>
                <div className={styles.resultAmount}>{money(auction?.currentBid)}</div>
              </>
            ) : (
              <div className={styles.resultSubcopy}>Returns to the auction pool</div>
            )}
          </div>
        </section>
      )}

      {showRecordBreak && (
        <RecordBreakOverlay
          key={`record-${soldOverlay.sessionKey}`}
          name={soldOverlay.name}
          team={soldOverlay.team}
          teamLogo={soldOverlay.teamLogo}
          amount={soldOverlay.amount}
          previousRecord={soldOverlay.previousRecord}
          playerImageUrl={soldOverlay.playerImageUrl}
          onComplete={handleRecordBreakComplete}
        />
      )}

      {showGavel && (
        <GavelOverlay
          key={soldOverlay.sessionKey}
          verdict={soldOverlay.verdict}
          name={soldOverlay.name}
          team={soldOverlay.team}
          teamLogo={soldOverlay.teamLogo}
          amount={soldOverlay.amount}
          squadPick={soldOverlay.squadPick}
          duration={soldOverlay.verdict === 'SOLD' ? 5500 : 4000}
          onComplete={soldOverlay.verdict === 'SOLD' ? handleGavelComplete : dismissOverlay}
        />
      )}

      {ceremonyEnabled && ceremonyActive && ceremonyTeam && (
        <SquadFormationCeremony
          team={ceremonyTeam}
          filledPlayers={teamRoster[ceremonyTeam.id] || []}
          squadSize={squadSize}
          saleSummary={saleSummary}
          phase={ceremonyPhase}
          newPlayerKey={newPlayerKey}
          flyRequest={flyRequest}
          flyDurationMs={flyDurationMs}
          exitDurationMs={exitDurationMs}
          registerNextSlot={registerNextSlot}
          sourceRef={sourceRef}
          onFlyComplete={completeFly}
        />
      )}

      {countdownActive && (
        <TournamentCountdownOverlay
          key={countdownActive.id}
          tournamentName={config?.auctionDisplayName || config?.tournamentName || title}
          logoUrl={config?.logoUrl}
          countdownSeconds={countdownActive.seconds}
          onComplete={handleCountdownComplete}
        />
      )}

      {cinematicPlaying && (
        <CinematicPlayerIntro
          player={player}
          playerRoles={config?.playerRoles}
          scene={auction?.sessionId}
        />
      )}
    </main>
  );
}
