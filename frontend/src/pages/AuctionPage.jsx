import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTournament } from '../contexts/TournamentContext';
import { auctionApi } from '../api/auction';
import { playerApi } from '../api/players';
import { teamApi } from '../api/teams';
import {
  announceAuctionStart, announceBid,
  announcePlayerSold, announcePlayerUnsold, stopSpeaking,
} from '../utils/voiceAnnouncement';
import { formatCurrency, formatRole, getRoleColor, getRoleBg } from '../utils/formatters';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import toast from 'react-hot-toast';
import {
  Gavel, Maximize2, Minimize2, Volume2, VolumeX,
  ChevronRight, CheckCircle, XCircle, Plus, Minus,
  Keyboard, ArrowUp, ArrowDown,
} from 'lucide-react';

/* ─── helpers ─────────────────────────────────────────────── */
function gdriveFallback(url) {
  if (!url) return null;
  const m = url.match(/[?&]id=([^&]+)/) || url.match(/\/d\/([^/]+)/);
  if (m) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w400-h400`;
  return url;
}

/* ─── Main Page ────────────────────────────────────────────── */
export default function AuctionPage() {
  const { activeTournament } = useTournament();

  const [auctionState, setAuctionState]     = useState(null);
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [teams, setTeams]                   = useState([]);
  const [loading, setLoading]               = useState(true);
  const [actionLoading, setActionLoading]   = useState(false);
  const [fullscreen, setFullscreen]         = useState(false);
  const [voiceEnabled, setVoiceEnabled]     = useState(true);
  const [bidFlash, setBidFlash]             = useState(false);
  const [bidKey, setBidKey]                 = useState(0);         // forces re-mount for count-up anim
  const [manualBid, setManualBid]           = useState('');        // manual bid input
  const [showKeyHelp, setShowKeyHelp]       = useState(false);
  const [soldOverlay, setSoldOverlay]       = useState(null);      // { name, team, amount }
  const containerRef = useRef(null);
  const manualBidRef = useRef(null);

  /* ── data fetch ── */
  const fetchAll = useCallback(async () => {
    if (!activeTournament) return;
    try {
      const [stateRes, playersRes, teamsRes] = await Promise.all([
        auctionApi.getState(activeTournament.id),
        playerApi.getAll(activeTournament.id, 'AVAILABLE'),
        teamApi.getAll(activeTournament.id),
      ]);
      setAuctionState(stateRes.data.data);
      setAvailablePlayers(playersRes.data.data || []);
      setTeams(teamsRes.data.data || []);
    } finally {
      setLoading(false);
    }
  }, [activeTournament]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── poll when active ── */
  useEffect(() => {
    if (auctionState?.status !== 'ACTIVE') return;
    const id = setInterval(async () => {
      if (!activeTournament) return;
      const res = await auctionApi.getState(activeTournament.id);
      setAuctionState(res.data.data);
    }, 4000);
    return () => clearInterval(id);
  }, [auctionState?.status, activeTournament]);

  /* ── actions ── */
  const handleStartAuction = useCallback(async (player) => {
    if (!activeTournament || actionLoading) return;
    setActionLoading(true);
    try {
      const res = await auctionApi.startAuction(activeTournament.id, player.id);
      setAuctionState(res.data.data);
      setManualBid('');
      setBidKey((k) => k + 1);
      setAvailablePlayers((p) => p.filter((pl) => pl.id !== player.id));
      if (voiceEnabled) announceAuctionStart(player.name, player.basePrice);
      toast.success(`Auction started for ${player.name}`);
    } finally {
      setActionLoading(false);
    }
  }, [activeTournament, actionLoading, voiceEnabled]);

  const handleBid = useCallback(async (teamId, customAmount) => {
    if (!activeTournament || actionLoading) return;
    setActionLoading(true);
    try {
      const res = await auctionApi.placeBid(activeTournament.id, teamId, customAmount ?? undefined);
      setAuctionState(res.data.data);
      setBidFlash(true);
      setBidKey((k) => k + 1);
      setTimeout(() => setBidFlash(false), 700);
      const team = teams.find((t) => t.id === teamId);
      if (voiceEnabled && team) announceBid(team.name, res.data.data.currentBid);
    } finally {
      setActionLoading(false);
    }
  }, [activeTournament, actionLoading, voiceEnabled, teams]);

  const handleSell = useCallback(async () => {
    if (!activeTournament || actionLoading) return;
    setActionLoading(true);
    try {
      const prev = auctionState;
      const res = await auctionApi.sellPlayer(activeTournament.id);
      setAuctionState(res.data.data);
      setSoldOverlay({
        name: prev?.currentPlayer?.name,
        team: res.data.data.highestBidderTeamName,
        amount: res.data.data.currentBid,
      });
      setTimeout(() => setSoldOverlay(null), 3500);
      if (voiceEnabled) announcePlayerSold(prev?.currentPlayer?.name, res.data.data.highestBidderTeamName, res.data.data.currentBid);
      const teamsRes = await teamApi.getAll(activeTournament.id);
      setTeams(teamsRes.data.data || []);
    } finally {
      setActionLoading(false);
    }
  }, [activeTournament, actionLoading, auctionState, voiceEnabled]);

  const handleUnsold = useCallback(async () => {
    if (!activeTournament || actionLoading) return;
    setActionLoading(true);
    try {
      const prev = auctionState;
      const res = await auctionApi.markUnsold(activeTournament.id);
      setAuctionState(res.data.data);
      if (voiceEnabled && prev?.currentPlayer?.name) announcePlayerUnsold(prev.currentPlayer.name);
      toast('Marked as UNSOLD', { icon: '❌' });
    } finally {
      setActionLoading(false);
    }
  }, [activeTournament, actionLoading, auctionState, voiceEnabled]);

  /* ── manual bid adjust ── */
  const adjustManualBid = (dir) => {
    const current = parseFloat(manualBid) || auctionState?.currentBid || 0;
    const step = current < 10000 ? 1000 : 2000;
    const next = dir === 'up' ? current + step : Math.max(auctionState?.currentBid || 0, current - step);
    setManualBid(String(next));
  };

  /* ── keyboard shortcuts ── */
  useEffect(() => {
    const onKey = (e) => {
      // Don't fire when typing in any input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      const isActive = auctionState?.status === 'ACTIVE';

      if (e.key === 's' || e.key === 'S') { if (isActive && auctionState?.highestBidderTeamId) handleSell(); }
      if (e.key === 'u' || e.key === 'U') { if (isActive) handleUnsold(); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); if (isActive) adjustManualBid('up'); }
      if (e.key === 'ArrowDown') { e.preventDefault(); if (isActive) adjustManualBid('down'); }
      if (e.key === 'f' || e.key === 'F') { toggleFullscreen(); }

      // Number keys 1-9 → bid for team at that index
      const num = parseInt(e.key, 10);
      if (!isNaN(num) && num >= 1 && num <= 9 && isActive) {
        const team = teams[num - 1];
        if (team) handleBid(team.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [auctionState, teams, handleSell, handleUnsold, handleBid]);

  /* ── fullscreen ── */
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };
  useEffect(() => {
    const h = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);

  if (!activeTournament) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <EmptyState icon={Gavel} title="No tournament selected" description="Select a tournament to start the auction." />
      </div>
    );
  }
  if (loading) {
    return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" text="Loading auction..." /></div>;
  }

  const isActive = auctionState?.status === 'ACTIVE';

  return (
    <div ref={containerRef} className="flex flex-col" style={{ minHeight: 'calc(100vh - 56px)', backgroundColor: 'var(--color-background)' }}>

      {/* ── Top Bar ── */}
      <div className="flex-shrink-0 px-4 py-2.5 flex items-center justify-between"
        style={{ backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-3">
          <Gavel size={18} style={{ color: 'var(--color-primary)' }} />
          <span className="font-bold" style={{ color: 'var(--color-text-primary)' }}>Live Auction</span>
          <span className="text-sm hidden sm:inline" style={{ color: 'var(--color-text-secondary)' }}>— {activeTournament.name}</span>
          {isActive && <span className="badge-in-auction">● LIVE</span>}
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary !p-2" title="Keyboard shortcuts" onClick={() => setShowKeyHelp(v => !v)}>
            <Keyboard size={15} />
          </button>
          <button className="btn-secondary !p-2"
            onClick={() => { setVoiceEnabled(v => { if (v) stopSpeaking(); return !v; }); }}
            title={voiceEnabled ? 'Mute' : 'Unmute'}>
            {voiceEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>
          <button className="btn-secondary !p-2" onClick={toggleFullscreen} title="F = Fullscreen">
            {fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>

      {/* ── Keyboard Help ── */}
      {showKeyHelp && (
        <div className="flex-shrink-0 px-4 py-2 text-xs flex flex-wrap gap-3 items-center"
          style={{ backgroundColor: 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
          {[
            ['1–9', 'Bid for team'],
            ['↑ ↓', 'Adjust manual bid'],
            ['S', 'Sell player'],
            ['U', 'Mark Unsold'],
            ['F', 'Fullscreen'],
          ].map(([k, v]) => (
            <span key={k}>
              <kbd className="px-1.5 py-0.5 rounded font-mono font-bold mr-1"
                style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-primary)' }}>
                {k}
              </kbd>
              {v}
            </span>
          ))}
        </div>
      )}

      {/* ── Main Layout ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ════ STAGE AREA ════ */}
        <div className="flex-1 flex flex-col overflow-auto">

          {isActive && auctionState?.currentPlayer ? (
            <>
              {/* ── STAGE: large player display ── */}
              <StageCard
                player={auctionState.currentPlayer}
                currentBid={auctionState.currentBid}
                nextBid={auctionState.nextBidAmount}
                highestBidderTeamName={auctionState.highestBidderTeamName}
                bidFlash={bidFlash}
                bidKey={bidKey}
              />

              {/* ── SOLD / UNSOLD controls ── */}
              <div className="flex gap-3 px-4 pb-3">
                <button
                  onClick={handleSell}
                  disabled={actionLoading || !auctionState?.highestBidderTeamId}
                  className="flex-1 btn-success text-sm py-3 font-bold tracking-wide"
                  title="S key"
                >
                  <CheckCircle size={18} />
                  SOLD <span className="opacity-60 text-xs">[S]</span>
                </button>
                <button
                  onClick={handleUnsold}
                  disabled={actionLoading}
                  className="flex-1 btn-danger text-sm py-3 font-bold tracking-wide"
                  title="U key"
                >
                  <XCircle size={18} />
                  UNSOLD <span className="opacity-60 text-xs">[U]</span>
                </button>
              </div>

              {/* ── Manual bid widget ── */}
              <ManualBidWidget
                manualBid={manualBid}
                setManualBid={setManualBid}
                manualBidRef={manualBidRef}
                onAdjust={adjustManualBid}
                nextBid={auctionState.nextBidAmount}
                currentBid={auctionState.currentBid}
                disabled={actionLoading}
              />

              {/* ── Team bid buttons ── */}
              <TeamBidGrid
                teams={teams}
                auctionState={auctionState}
                manualBid={manualBid}
                onBid={(teamId) => handleBid(teamId, manualBid ? parseFloat(manualBid) : undefined)}
                disabled={actionLoading}
              />
            </>
          ) : (
            /* ── IDLE / between players ── */
            <IdleStage
              auctionState={auctionState}
              availablePlayers={availablePlayers}
              actionLoading={actionLoading}
              onStart={handleStartAuction}
            />
          )}
        </div>

        {/* ════ TEAMS SIDEBAR ════ */}
        <TeamsSidebar teams={teams} auctionState={auctionState} />
      </div>

      {/* ── SOLD overlay ── */}
      {soldOverlay && <SoldOverlay {...soldOverlay} />}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   STAGE CARD — centre of the screen, projector-ready
───────────────────────────────────────────────────────────── */
function StageCard({ player, currentBid, nextBid, highestBidderTeamName, bidFlash, bidKey }) {
  const roleColor = getRoleColor(player.role);
  const roleBg    = getRoleBg(player.role);
  const imgUrl    = gdriveFallback(player.imageUrl);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">

      {/* Player photo — large, centred */}
      <div
        className="stage-scanlines relative rounded-3xl shadow-2xl overflow-hidden flex items-center justify-center"
        style={{
          width: 'min(280px, 38vw)',
          height: 'min(320px, 42vw)',
          minWidth: 180,
          minHeight: 200,
          background: `radial-gradient(circle at 50% 60%, ${roleBg} 0%, var(--color-surface-2) 80%)`,
          border: `3px solid ${roleColor}`,
          boxShadow: `0 0 40px ${roleColor}55, 0 0 80px ${roleColor}22`,
        }}
      >
        {imgUrl ? (
          <img
            src={imgUrl}
            alt={player.name}
            className="w-full h-full object-cover object-top"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}
        {/* fallback initial */}
        <div
          className="absolute inset-0 items-center justify-center text-8xl font-black select-none"
          style={{ display: imgUrl ? 'none' : 'flex', color: roleColor, opacity: 0.6 }}
        >
          {player.name[0]}
        </div>

        {/* Role badge pinned top-right */}
        <div
          className="absolute top-3 right-3 text-xs px-2.5 py-1 rounded-full font-bold backdrop-blur-sm"
          style={{ backgroundColor: roleBg, color: roleColor, border: `1px solid ${roleColor}` }}
        >
          {formatRole(player.role)}
        </div>
      </div>

      {/* Name */}
      <div className="text-center">
        <h1
          className="font-black leading-tight text-shimmer"
          style={{ fontSize: 'clamp(1.6rem, 4vw, 3rem)', letterSpacing: '-0.02em' }}
        >
          {player.name}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          Base Price: <span style={{ color: 'var(--color-accent)', fontWeight: 700 }}>{formatCurrency(player.basePrice)}</span>
        </p>
      </div>

      {/* Bid counter */}
      <BidCounter
        currentBid={currentBid}
        nextBid={nextBid}
        highestBidderTeamName={highestBidderTeamName}
        bidFlash={bidFlash}
        bidKey={bidKey}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   BID COUNTER — animated count-up display
───────────────────────────────────────────────────────────── */
function BidCounter({ currentBid, nextBid, highestBidderTeamName, bidFlash, bidKey }) {
  return (
    <div
      className="w-full max-w-md mx-auto rounded-3xl px-6 py-4 text-center transition-all duration-300 relative overflow-hidden"
      style={{
        backgroundColor: bidFlash ? 'rgba(245,158,11,0.12)' : 'var(--color-surface)',
        border: `2px solid ${bidFlash ? 'var(--color-accent)' : 'var(--color-primary)'}`,
        boxShadow: bidFlash
          ? '0 0 30px rgba(245,158,11,0.4), 0 0 60px rgba(245,158,11,0.2)'
          : '0 0 20px rgba(59,130,246,0.2)',
      }}
    >
      <p className="text-xs uppercase tracking-widest mb-1 font-semibold"
        style={{ color: 'var(--color-text-secondary)' }}>
        Current Bid
      </p>

      {/* The animated number */}
      <div
        key={bidKey}
        className="animate-bid-count animate-bid-glow font-black"
        style={{
          fontSize: 'clamp(2.4rem, 6vw, 4rem)',
          color: 'var(--color-primary)',
          lineHeight: 1,
        }}
      >
        {formatCurrency(currentBid)}
      </div>

      {highestBidderTeamName ? (
        <p className="mt-2 font-bold text-base" style={{ color: 'var(--color-accent)' }}>
          🏏 {highestBidderTeamName}
        </p>
      ) : (
        <p className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>No bids yet — be first!</p>
      )}

      <div className="mt-3 pt-3 flex items-center justify-center gap-2" style={{ borderTop: '1px solid var(--color-border)' }}>
        <ArrowUp size={14} style={{ color: 'var(--color-text-secondary)' }} />
        <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Next: <strong style={{ color: 'var(--color-secondary)' }}>{formatCurrency(nextBid)}</strong>
        </span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MANUAL BID WIDGET
───────────────────────────────────────────────────────────── */
function ManualBidWidget({ manualBid, setManualBid, manualBidRef, onAdjust, nextBid, currentBid, disabled }) {
  return (
    <div className="px-4 pb-2">
      <div
        className="rounded-2xl p-3 flex items-center gap-2"
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <span className="text-xs font-semibold whitespace-nowrap" style={{ color: 'var(--color-text-secondary)' }}>
          Manual Bid
        </span>
        <button
          onClick={() => onAdjust('down')}
          disabled={disabled}
          className="btn-secondary !p-1.5 flex-shrink-0"
          title="↓ Arrow or click"
        >
          <Minus size={14} />
        </button>
        <input
          ref={manualBidRef}
          type="number"
          className="input text-center font-bold !py-1.5"
          placeholder={`${nextBid} (auto)`}
          value={manualBid}
          onChange={(e) => setManualBid(e.target.value)}
          min={currentBid + 1}
          step={currentBid < 10000 ? 1000 : 2000}
          disabled={disabled}
        />
        <button
          onClick={() => onAdjust('up')}
          disabled={disabled}
          className="btn-secondary !p-1.5 flex-shrink-0"
          title="↑ Arrow or click"
        >
          <Plus size={14} />
        </button>
        {manualBid && (
          <button
            className="text-xs px-2 py-1 rounded-lg flex-shrink-0"
            style={{ color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-surface-2)' }}
            onClick={() => setManualBid('')}
          >
            Clear
          </button>
        )}
      </div>
      <p className="text-xs mt-1 px-1" style={{ color: 'var(--color-text-secondary)' }}>
        Leave blank for auto-increment · ↑↓ arrows to adjust · then click a team to bid
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   TEAM BID GRID
───────────────────────────────────────────────────────────── */
function TeamBidGrid({ teams, auctionState, manualBid, onBid, disabled }) {
  const effectiveBid = manualBid ? parseFloat(manualBid) : auctionState?.nextBidAmount;

  return (
    <div className="px-4 pb-4">
      <p className="text-xs font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
        <span>Place Bid</span>
        <span style={{ color: 'var(--color-primary)' }}>{formatCurrency(effectiveBid)}</span>
        <span className="ml-auto text-xs" style={{ color: 'var(--color-text-secondary)', opacity: 0.6 }}>
          Press 1–9 for quick bid
        </span>
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
        {teams.map((team, idx) => {
          const isHighest = team.id === auctionState?.highestBidderTeamId;
          const canBid    = team.remainingBudget >= (effectiveBid || 0);
          const pct       = team.budget ? ((team.budget - team.remainingBudget) / team.budget) * 100 : 0;

          return (
            <button
              key={team.id}
              onClick={() => onBid(team.id)}
              disabled={disabled || !canBid}
              className="relative flex flex-col gap-1 px-3 py-3 rounded-2xl font-medium transition-all duration-200 text-left"
              style={{
                backgroundColor: isHighest ? 'var(--color-primary)' : 'var(--color-surface)',
                border: `2px solid ${isHighest ? 'var(--color-primary)' : 'var(--color-border)'}`,
                color: isHighest ? 'white' : 'var(--color-text-primary)',
                opacity: !canBid ? 0.35 : 1,
                boxShadow: isHighest ? '0 0 18px var(--color-primary)' : 'none',
                animation: isHighest ? 'teamHighlight 1.2s ease-in-out infinite' : 'none',
              }}
            >
              {/* Keyboard hint badge */}
              {idx < 9 && (
                <span
                  className="absolute top-2 right-2 text-xs w-5 h-5 rounded flex items-center justify-center font-mono font-bold"
                  style={{
                    backgroundColor: isHighest ? 'rgba(255,255,255,0.2)' : 'var(--color-surface-2)',
                    color: isHighest ? 'white' : 'var(--color-text-secondary)',
                  }}
                >
                  {idx + 1}
                </span>
              )}
              {isHighest && (
                <span className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.9)' }}>● Highest</span>
              )}

              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center font-bold text-sm flex-shrink-0"
                  style={{ backgroundColor: isHighest ? 'rgba(255,255,255,0.2)' : 'var(--color-surface-2)', color: isHighest ? 'white' : 'var(--color-primary)' }}
                >
                  {team.logoUrl ? (
                    <img src={team.logoUrl} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                  ) : team.name[0]}
                </div>
                <span className="font-bold text-sm truncate">{team.name}</span>
              </div>

              <div className="text-xs mt-0.5" style={{ color: isHighest ? 'rgba(255,255,255,0.75)' : 'var(--color-text-secondary)' }}>
                {formatCurrency(team.remainingBudget)} left
              </div>

              {/* Mini budget bar */}
              <div className="h-1 rounded-full overflow-hidden mt-1" style={{ backgroundColor: isHighest ? 'rgba(255,255,255,0.2)' : 'var(--color-surface-2)' }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: isHighest ? 'rgba(255,255,255,0.7)' : pct > 80 ? 'var(--color-danger)' : 'var(--color-primary)',
                  }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   IDLE STAGE — between players
───────────────────────────────────────────────────────────── */
function IdleStage({ auctionState, availablePlayers, actionLoading, onStart }) {
  return (
    <div className="flex-1 flex flex-col p-4 gap-4">
      <div
        className="rounded-3xl p-8 text-center flex flex-col items-center gap-3"
        style={{
          background: 'linear-gradient(135deg, var(--color-surface) 0%, var(--color-surface-2) 100%)',
          border: '1px solid var(--color-border)',
        }}
      >
        <Gavel size={52} style={{ color: 'var(--color-primary)', opacity: 0.5 }} />
        <h2 className="text-2xl font-black" style={{ color: 'var(--color-text-primary)' }}>
          {auctionState?.status === 'SOLD'   ? '✅ SOLD! Pick next player' :
           auctionState?.status === 'UNSOLD' ? '❌ UNSOLD. Pick next player' :
           'Select a player to begin'}
        </h2>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {availablePlayers.length} player{availablePlayers.length !== 1 ? 's' : ''} available
        </p>
      </div>

      <div>
        <p className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
          Available Players
        </p>
        {availablePlayers.length === 0 ? (
          <p className="text-center py-8 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            All players have been auctioned.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {availablePlayers.map((player) => {
              const imgUrl = gdriveFallback(player.imageUrl);
              return (
                <button
                  key={player.id}
                  onClick={() => onStart(player)}
                  disabled={actionLoading}
                  className="flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200"
                  style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--color-border)'}
                >
                  <div
                    className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center font-bold text-lg"
                    style={{ backgroundColor: getRoleBg(player.role), color: getRoleColor(player.role) }}
                  >
                    {imgUrl ? (
                      <img src={imgUrl} alt={player.name} className="w-full h-full object-cover object-top"
                        onError={(e) => { e.target.style.display = 'none'; }} />
                    ) : player.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>{player.name}</p>
                    <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      {formatRole(player.role)} · {formatCurrency(player.basePrice)}
                    </p>
                  </div>
                  <ChevronRight size={15} style={{ color: 'var(--color-text-secondary)', flexShrink: 0 }} />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   TEAMS SIDEBAR
───────────────────────────────────────────────────────────── */
function TeamsSidebar({ teams, auctionState }) {
  return (
    <div
      className="w-60 xl:w-72 flex-shrink-0 overflow-auto p-3 space-y-2 hidden lg:block"
      style={{ backgroundColor: 'var(--color-surface)', borderLeft: '1px solid var(--color-border)' }}
    >
      <p className="text-xs font-bold uppercase tracking-widest px-1 mb-3" style={{ color: 'var(--color-text-secondary)' }}>
        Teams
      </p>
      {teams.map((team) => {
        const isHighest = team.id === auctionState?.highestBidderTeamId;
        const pct = team.budget ? ((team.budget - team.remainingBudget) / team.budget) * 100 : 0;
        return (
          <div
            key={team.id}
            className="rounded-2xl p-3 transition-all duration-300"
            style={{
              backgroundColor: isHighest ? 'rgba(59,130,246,0.08)' : 'var(--color-surface-2)',
              border: `1.5px solid ${isHighest ? 'var(--color-primary)' : 'var(--color-border)'}`,
              boxShadow: isHighest ? '0 0 12px rgba(59,130,246,0.35)' : 'none',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center font-bold text-sm flex-shrink-0"
                style={{ backgroundColor: isHighest ? 'var(--color-primary)' : 'var(--color-surface)', color: isHighest ? 'white' : 'var(--color-primary)', border: '1px solid var(--color-border)' }}
              >
                {team.logoUrl ? (
                  <img src={team.logoUrl} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                ) : team.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>{team.name}</p>
                {isHighest && <p className="text-xs font-semibold" style={{ color: 'var(--color-primary)' }}>● Highest Bid</p>}
              </div>
            </div>
            <div className="flex justify-between text-xs mb-1">
              <span style={{ color: 'var(--color-text-secondary)' }}>Remaining</span>
              <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>{formatCurrency(team.remainingBudget)}</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-border)' }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: pct > 80 ? 'var(--color-danger)' : 'var(--color-primary)' }} />
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span style={{ color: 'var(--color-text-secondary)' }}>{team.playerCount} players</span>
              <span style={{ color: 'var(--color-text-secondary)' }}>{pct.toFixed(0)}% spent</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SOLD OVERLAY — full screen celebration
───────────────────────────────────────────────────────────── */
function SoldOverlay({ name, team, amount }) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 animate-fade-in"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
    >
      <div className="animate-sold text-center">
        <div className="text-8xl mb-4">🏏</div>
        <h1
          className="font-black uppercase tracking-widest text-shimmer mb-2"
          style={{ fontSize: 'clamp(2.5rem, 8vw, 6rem)' }}
        >
          SOLD!
        </h1>
        <p className="text-4xl font-black mb-2" style={{ color: 'white' }}>{name}</p>
        <p className="text-2xl font-bold mb-1" style={{ color: 'var(--color-accent)' }}>
          {team}
        </p>
        <p className="text-3xl font-black" style={{ color: 'var(--color-success)' }}>
          {formatCurrency(amount)}
        </p>
      </div>
    </div>
  );
}
