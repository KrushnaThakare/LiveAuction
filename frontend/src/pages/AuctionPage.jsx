import { useState, useEffect, useCallback, useRef } from 'react';
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
  ChevronRight, CheckCircle, XCircle, Plus, Minus, Keyboard,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
   Image helper — converts any Google Drive share URL to a
   direct CDN link that works without auth / redirects.
   Uses lh3.googleusercontent.com which is the actual host
   that Drive's thumbnail endpoint 302s to, so we skip the
   intermediary entirely and avoid the 429 rate-limit.
───────────────────────────────────────────────────────────── */
function driveImgUrl(url) {
  if (!url) return null;

  // Already a direct lh3 link
  if (url.includes('lh3.googleusercontent.com')) return url;

  // Extract file ID from any drive.google.com URL variant
  let id = null;
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,          // /file/d/{id}/view
    /[?&]id=([a-zA-Z0-9_-]+)/,              // ?id= or &id=
    /\/d\/([a-zA-Z0-9_-]+)/,                // generic /d/{id}
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) { id = m[1]; break; }
  }

  if (id) {
    // lh3 direct CDN — no auth, no redirect, no rate limit
    return `https://lh3.googleusercontent.com/d/${id}=w600-h600`;
  }

  return url; // non-Drive URL — return as-is
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════ */
export default function AuctionPage() {
  const { activeTournament } = useTournament();

  const [auctionState, setAuctionState]         = useState(null);
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [teams, setTeams]                       = useState([]);
  const [loading, setLoading]                   = useState(true);
  const [actionLoading, setActionLoading]       = useState(false);
  const [fullscreen, setFullscreen]             = useState(false);
  const [voiceEnabled, setVoiceEnabled]         = useState(true);
  const [bidFlash, setBidFlash]                 = useState(false);
  const [bidKey, setBidKey]                     = useState(0);
  const [proposedBid, setProposedBid]           = useState(null); // null = use auto-increment
  const [showKeyHelp, setShowKeyHelp]           = useState(false);
  const [soldOverlay, setSoldOverlay]           = useState(null);
  const containerRef = useRef(null);

  /* ── fetch ── */
  const fetchAll = useCallback(async () => {
    if (!activeTournament) return;
    try {
      const [s, p, t] = await Promise.all([
        auctionApi.getState(activeTournament.id),
        playerApi.getAll(activeTournament.id, 'AVAILABLE'),
        teamApi.getAll(activeTournament.id),
      ]);
      setAuctionState(s.data.data);
      setAvailablePlayers(p.data.data || []);
      setTeams(t.data.data || []);
    } finally {
      setLoading(false);
    }
  }, [activeTournament]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── poll while active ── */
  useEffect(() => {
    if (auctionState?.status !== 'ACTIVE') return;
    const id = setInterval(async () => {
      if (!activeTournament) return;
      const res = await auctionApi.getState(activeTournament.id);
      setAuctionState(res.data.data);
    }, 5000);
    return () => clearInterval(id);
  }, [auctionState?.status, activeTournament]);

  /* ── start auction ── */
  const handleStartAuction = useCallback(async (player) => {
    if (!activeTournament || actionLoading) return;
    setActionLoading(true);
    try {
      const res = await auctionApi.startAuction(activeTournament.id, player.id);
      setAuctionState(res.data.data);
      setProposedBid(null);
      setBidKey(k => k + 1);
      setAvailablePlayers(p => p.filter(pl => pl.id !== player.id));
      if (voiceEnabled) announceAuctionStart(player.name, player.basePrice);
      toast.success(`Auction started for ${player.name}`);
    } finally {
      setActionLoading(false);
    }
  }, [activeTournament, actionLoading, voiceEnabled]);

  /* ── place bid ── */
  const handleBid = useCallback(async (teamId) => {
    if (!activeTournament || actionLoading) return;
    const amount = proposedBid ?? undefined; // undefined → backend uses auto-increment
    setActionLoading(true);
    try {
      const res = await auctionApi.placeBid(activeTournament.id, teamId, amount);
      setAuctionState(res.data.data);
      setProposedBid(null);            // reset after bid is placed
      setBidFlash(true);
      setBidKey(k => k + 1);
      setTimeout(() => setBidFlash(false), 800);
      const team = teams.find(t => t.id === teamId);
      if (voiceEnabled && team) announceBid(team.name, res.data.data.currentBid);
    } finally {
      setActionLoading(false);
    }
  }, [activeTournament, actionLoading, proposedBid, voiceEnabled, teams]);

  /* ── sell ── */
  const handleSell = useCallback(async () => {
    if (!activeTournament || actionLoading || !auctionState?.highestBidderTeamId) return;
    setActionLoading(true);
    try {
      const prev = auctionState;
      const res = await auctionApi.sellPlayer(activeTournament.id);
      setAuctionState(res.data.data);
      setProposedBid(null);
      setSoldOverlay({
        name:   prev?.currentPlayer?.name,
        team:   res.data.data.highestBidderTeamName,
        amount: res.data.data.currentBid,
      });
      setTimeout(() => setSoldOverlay(null), 4000);
      if (voiceEnabled)
        announcePlayerSold(prev?.currentPlayer?.name, res.data.data.highestBidderTeamName, res.data.data.currentBid);
      const teamsRes = await teamApi.getAll(activeTournament.id);
      setTeams(teamsRes.data.data || []);
    } finally {
      setActionLoading(false);
    }
  }, [activeTournament, actionLoading, auctionState, voiceEnabled]);

  /* ── unsold ── */
  const handleUnsold = useCallback(async () => {
    if (!activeTournament || actionLoading) return;
    setActionLoading(true);
    try {
      const prev = auctionState;
      const res = await auctionApi.markUnsold(activeTournament.id);
      setAuctionState(res.data.data);
      setProposedBid(null);
      if (voiceEnabled && prev?.currentPlayer?.name) announcePlayerUnsold(prev.currentPlayer.name);
      toast('Marked as UNSOLD', { icon: '❌' });
    } finally {
      setActionLoading(false);
    }
  }, [activeTournament, actionLoading, auctionState, voiceEnabled]);

  /* ── proposed bid step helpers ── */
  const computeStep = useCallback((base) => base < 10000 ? 1000 : 2000, []);

  const stepUp = useCallback(() => {
    setProposedBid(prev => {
      const base = prev ?? auctionState?.currentBid ?? 0;
      const step = computeStep(base);
      return base + step;
    });
    setBidKey(k => k + 1);
  }, [auctionState?.currentBid, computeStep]);

  const stepDown = useCallback(() => {
    setProposedBid(prev => {
      const base = prev ?? auctionState?.currentBid ?? 0;
      const step = computeStep(base);
      const next = base - step;
      // Can't go below the committed current bid
      const floor = auctionState?.currentBid ?? 0;
      return next <= floor ? null : next;
    });
    setBidKey(k => k + 1);
  }, [auctionState?.currentBid, computeStep]);

  /* ── keyboard ── */
  useEffect(() => {
    const onKey = (e) => {
      const isActive = auctionState?.status === 'ACTIVE';
      const inInput  = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT';

      // Arrow keys always work, even when input focused
      if (e.key === 'ArrowUp')   { e.preventDefault(); if (isActive) stepUp();   return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); if (isActive) stepDown(); return; }

      // All other shortcuts only when not typing
      if (inInput) return;

      if ((e.key === 's' || e.key === 'S') && isActive && auctionState?.highestBidderTeamId) { handleSell();   return; }
      if ((e.key === 'u' || e.key === 'U') && isActive)                                       { handleUnsold(); return; }
      if (e.key === 'f' || e.key === 'F') { toggleFullscreen(); return; }

      const num = parseInt(e.key, 10);
      if (!isNaN(num) && num >= 1 && num <= 9 && isActive) {
        const team = teams[num - 1];
        if (team) handleBid(team.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [auctionState, teams, handleSell, handleUnsold, handleBid, stepUp, stepDown]);

  /* ── fullscreen ── */
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen();
    else document.exitFullscreen();
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

  const isActive    = auctionState?.status === 'ACTIVE';
  const displayBid  = proposedBid ?? auctionState?.nextBidAmount ?? 0;
  const isProposed  = proposedBid !== null;

  return (
    <div ref={containerRef} className="flex flex-col"
      style={{ minHeight: 'calc(100vh - 56px)', backgroundColor: 'var(--color-background)' }}>

      {/* ── Top Bar ── */}
      <div className="flex-shrink-0 px-4 py-2.5 flex items-center justify-between"
        style={{ backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-3">
          <Gavel size={18} style={{ color: 'var(--color-primary)' }} />
          <span className="font-bold" style={{ color: 'var(--color-text-primary)' }}>Live Auction</span>
          <span className="text-sm hidden sm:inline" style={{ color: 'var(--color-text-secondary)' }}>
            — {activeTournament.name}
          </span>
          {isActive && <span className="badge-in-auction">● LIVE</span>}
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary !p-2" onClick={() => setShowKeyHelp(v => !v)} title="Shortcuts">
            <Keyboard size={15} />
          </button>
          <button className="btn-secondary !p-2"
            onClick={() => { setVoiceEnabled(v => { if (v) stopSpeaking(); return !v; }); }}>
            {voiceEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>
          <button className="btn-secondary !p-2" onClick={toggleFullscreen} title="F = Fullscreen">
            {fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>

      {/* ── Keyboard help strip ── */}
      {showKeyHelp && (
        <div className="flex-shrink-0 px-4 py-2 flex flex-wrap gap-4 text-xs items-center"
          style={{ backgroundColor: 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
          {[['↑ ↓','Set bid amount'],['1–9','Bid for team'],['S','Sell'],['U','Unsold'],['F','Fullscreen']].map(([k,v]) => (
            <span key={k}>
              <kbd className="px-1.5 py-0.5 rounded font-mono font-bold mr-1"
                style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-primary)' }}>{k}</kbd>
              {v}
            </span>
          ))}
        </div>
      )}

      {/* ── Layout ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ════ STAGE ════ */}
        <div className="flex-1 flex flex-col overflow-auto">
          {isActive && auctionState?.currentPlayer ? (
            <>
              {/* Player stage */}
              <StageCard
                player={auctionState.currentPlayer}
                committedBid={auctionState.currentBid}
                proposedBid={proposedBid}
                highestBidderTeamName={auctionState.highestBidderTeamName}
                bidFlash={bidFlash}
                bidKey={bidKey}
              />

              {/* SOLD / UNSOLD */}
              <div className="flex gap-3 px-4 pb-3">
                <button onClick={handleSell}
                  disabled={actionLoading || !auctionState?.highestBidderTeamId}
                  className="flex-1 btn-success py-3 text-sm font-bold tracking-wide">
                  <CheckCircle size={18} />
                  SOLD <span className="opacity-50 text-xs font-normal ml-1">[S]</span>
                </button>
                <button onClick={handleUnsold}
                  disabled={actionLoading}
                  className="flex-1 btn-danger py-3 text-sm font-bold tracking-wide">
                  <XCircle size={18} />
                  UNSOLD <span className="opacity-50 text-xs font-normal ml-1">[U]</span>
                </button>
              </div>

              {/* Bid amount control strip */}
              <BidAmountStrip
                proposedBid={proposedBid}
                setProposedBid={setProposedBid}
                setBidKey={setBidKey}
                committedBid={auctionState.currentBid}
                nextBid={auctionState.nextBidAmount}
                onStepUp={stepUp}
                onStepDown={stepDown}
                disabled={actionLoading}
              />

              {/* Teams grid */}
              <TeamBidGrid
                teams={teams}
                auctionState={auctionState}
                displayBid={displayBid}
                isProposed={isProposed}
                onBid={handleBid}
                disabled={actionLoading}
              />
            </>
          ) : (
            <IdleStage
              auctionState={auctionState}
              availablePlayers={availablePlayers}
              actionLoading={actionLoading}
              onStart={handleStartAuction}
            />
          )}
        </div>

        {/* ════ SIDEBAR ════ */}
        <TeamsSidebar teams={teams} auctionState={auctionState} />
      </div>

      {/* SOLD overlay */}
      {soldOverlay && <SoldOverlay {...soldOverlay} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   STAGE CARD
   Shows: photo | name | role | bid counter
═══════════════════════════════════════════════════════════ */
function StageCard({ player, committedBid, proposedBid, highestBidderTeamName, bidFlash, bidKey }) {
  const roleColor = getRoleColor(player.role);
  const roleBg    = getRoleBg(player.role);
  const imgUrl    = driveImgUrl(player.imageUrl);

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 pt-4 pb-2 gap-3">

      {/* ── Photo ── */}
      <div
        className="stage-scanlines relative rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center"
        style={{
          width: 'min(260px, 34vw)', height: 'min(300px, 38vw)',
          minWidth: 160, minHeight: 190,
          background: `radial-gradient(circle at 50% 55%, ${roleBg} 0%, var(--color-surface-2) 80%)`,
          border: `3px solid ${roleColor}`,
          boxShadow: `0 0 40px ${roleColor}44, 0 0 80px ${roleColor}18`,
        }}
      >
        <PlayerImage imgUrl={imgUrl} name={player.name} roleColor={roleColor} />

        {/* Role badge */}
        <div className="absolute top-3 right-3 text-xs px-2.5 py-1 rounded-full font-bold backdrop-blur-sm"
          style={{ backgroundColor: roleBg, color: roleColor, border: `1px solid ${roleColor}` }}>
          {formatRole(player.role)}
        </div>
      </div>

      {/* ── Name ── */}
      <div className="text-center">
        <h1 className="font-black leading-tight text-shimmer"
          style={{ fontSize: 'clamp(1.6rem, 4vw, 3rem)', letterSpacing: '-0.02em' }}>
          {player.name}
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
          Base: <span style={{ color: 'var(--color-accent)', fontWeight: 700 }}>{formatCurrency(player.basePrice)}</span>
        </p>
      </div>

      {/* ── Bid counter ── */}
      <BidCounter
        committedBid={committedBid}
        proposedBid={proposedBid}
        highestBidderTeamName={highestBidderTeamName}
        bidFlash={bidFlash}
        bidKey={bidKey}
      />
    </div>
  );
}

/* ── PlayerImage with proper fallback chain ── */
function PlayerImage({ imgUrl, name, roleColor }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => { setFailed(false); }, [imgUrl]);

  if (!imgUrl || failed) {
    return (
      <span className="text-7xl font-black select-none" style={{ color: roleColor, opacity: 0.55 }}>
        {name?.[0] ?? '?'}
      </span>
    );
  }

  return (
    <img
      src={imgUrl}
      alt={name}
      referrerPolicy="no-referrer"
      crossOrigin="anonymous"
      className="w-full h-full object-cover object-top"
      onError={() => setFailed(true)}
    />
  );
}

/* ═══════════════════════════════════════════════════════════
   BID COUNTER
   Shows proposed bid (orange) OR committed bid (primary)
═══════════════════════════════════════════════════════════ */
function BidCounter({ committedBid, proposedBid, highestBidderTeamName, bidFlash, bidKey }) {
  const isProposed  = proposedBid !== null;
  const displayBid  = isProposed ? proposedBid : committedBid;
  const accentColor = isProposed ? 'var(--color-accent)' : 'var(--color-primary)';

  return (
    <div
      className="w-full max-w-md mx-auto rounded-3xl px-6 py-4 text-center relative overflow-hidden transition-all duration-300"
      style={{
        backgroundColor: bidFlash ? 'rgba(245,158,11,0.1)' : 'var(--color-surface)',
        border: `2px solid ${isProposed ? 'var(--color-accent)' : bidFlash ? 'var(--color-accent)' : 'var(--color-primary)'}`,
        boxShadow: isProposed
          ? '0 0 24px rgba(245,158,11,0.3), 0 0 48px rgba(245,158,11,0.1)'
          : '0 0 20px rgba(59,130,246,0.2)',
      }}
    >
      {/* Label */}
      <p className="text-xs uppercase tracking-widest font-semibold mb-1"
        style={{ color: isProposed ? 'var(--color-accent)' : 'var(--color-text-secondary)' }}>
        {isProposed ? '⬆ Proposed Bid' : 'Current Bid'}
      </p>

      {/* Amount — re-mounts for animation */}
      <div key={bidKey}
        className="font-black animate-bid-count"
        style={{ fontSize: 'clamp(2.4rem, 6vw, 4rem)', color: accentColor, lineHeight: 1,
          textShadow: `0 0 20px ${accentColor}66` }}>
        {formatCurrency(displayBid)}
      </div>

      {/* Bidder / hint */}
      {isProposed ? (
        <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--color-accent)' }}>
          ↑ ↓ to adjust · click team to confirm bid
        </p>
      ) : highestBidderTeamName ? (
        <p className="mt-2 font-bold text-base" style={{ color: 'var(--color-accent)' }}>
          🏏 {highestBidderTeamName}
        </p>
      ) : (
        <p className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          No bids yet — be first!
        </p>
      )}

      {/* Separator + committed info when proposed is shown */}
      {isProposed && (
        <div className="mt-2 pt-2 flex justify-center gap-4 text-xs"
          style={{ borderTop: '1px solid var(--color-border)' }}>
          <span style={{ color: 'var(--color-text-secondary)' }}>
            Current: <strong style={{ color: 'var(--color-primary)' }}>{formatCurrency(committedBid)}</strong>
            {highestBidderTeamName && <span style={{ color: 'var(--color-accent)' }}> ({highestBidderTeamName})</span>}
          </span>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   BID AMOUNT STRIP
   +/− buttons + editable input to set the proposed bid
═══════════════════════════════════════════════════════════ */
function BidAmountStrip({ proposedBid, setProposedBid, setBidKey, committedBid, nextBid, onStepUp, onStepDown, disabled }) {
  const displayed = proposedBid ?? nextBid ?? 0;

  const handleInputChange = (e) => {
    const val = e.target.value;
    if (val === '' || val === '0') { setProposedBid(null); return; }
    const n = parseFloat(val);
    if (!isNaN(n)) { setProposedBid(n); setBidKey(k => k + 1); }
  };

  const handleInputKey = (e) => {
    // Arrow keys work even when focused here
    if (e.key === 'ArrowUp')   { e.preventDefault(); onStepUp();   }
    if (e.key === 'ArrowDown') { e.preventDefault(); onStepDown(); }
  };

  return (
    <div className="px-4 pb-2">
      <div className="rounded-2xl p-3 flex items-center gap-2"
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>

        <span className="text-xs font-bold whitespace-nowrap" style={{ color: 'var(--color-text-secondary)' }}>
          Bid Amount
        </span>

        <button onClick={onStepDown} disabled={disabled || !proposedBid}
          className="btn-secondary !p-2 flex-shrink-0" title="↓ Arrow">
          <Minus size={14} />
        </button>

        <input
          type="number"
          className="input text-center font-bold !py-1.5 flex-1"
          placeholder={`${nextBid} (auto)`}
          value={proposedBid ?? ''}
          min={committedBid + 1}
          step={committedBid < 10000 ? 1000 : 2000}
          onChange={handleInputChange}
          onKeyDown={handleInputKey}
          disabled={disabled}
        />

        <button onClick={onStepUp} disabled={disabled}
          className="btn-secondary !p-2 flex-shrink-0" title="↑ Arrow">
          <Plus size={14} />
        </button>

        {proposedBid !== null && (
          <button onClick={() => { setProposedBid(null); setBidKey(k => k + 1); }}
            className="text-xs px-2 py-1 rounded-lg flex-shrink-0"
            style={{ color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-surface-2)' }}>
            Reset
          </button>
        )}
      </div>
      <p className="text-xs mt-1 px-1" style={{ color: 'var(--color-text-secondary)' }}>
        ↑ ↓ arrows set amount · click a team button to record their bid · then SOLD to finalise
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TEAM BID GRID
═══════════════════════════════════════════════════════════ */
function TeamBidGrid({ teams, auctionState, displayBid, isProposed, onBid, disabled }) {
  return (
    <div className="px-4 pb-4">
      <p className="text-xs font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
        <span>{isProposed ? 'Bid at' : 'Next bid'}</span>
        <span style={{ color: isProposed ? 'var(--color-accent)' : 'var(--color-primary)', fontWeight: 700 }}>
          {formatCurrency(displayBid)}
        </span>
        <span className="ml-auto opacity-60">Press 1–9 for quick bid</span>
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
        {teams.map((team, idx) => {
          const isHighest = team.id === auctionState?.highestBidderTeamId;
          const canBid    = team.remainingBudget >= displayBid;
          const pct       = team.budget ? ((team.budget - team.remainingBudget) / team.budget) * 100 : 0;

          return (
            <button
              key={team.id}
              onClick={() => onBid(team.id)}
              disabled={disabled || !canBid}
              title={`${team.name} — Press ${idx + 1}`}
              className="relative flex flex-col gap-1 px-3 py-3 rounded-2xl font-medium transition-all duration-200 text-left active:scale-95"
              style={{
                backgroundColor: isHighest ? 'var(--color-primary)' : 'var(--color-surface)',
                border: `2px solid ${isHighest ? 'var(--color-primary)' : 'var(--color-border)'}`,
                color: isHighest ? 'white' : 'var(--color-text-primary)',
                opacity: !canBid ? 0.3 : 1,
                boxShadow: isHighest ? '0 0 20px var(--color-primary)' : 'none',
                animation: isHighest ? 'teamHighlight 1.2s ease-in-out infinite' : 'none',
              }}
            >
              {/* Keyboard number */}
              {idx < 9 && (
                <span className="absolute top-2 right-2 text-xs w-5 h-5 rounded flex items-center justify-center font-mono font-bold"
                  style={{ backgroundColor: isHighest ? 'rgba(255,255,255,0.2)' : 'var(--color-surface-2)',
                           color: isHighest ? 'white' : 'var(--color-text-secondary)' }}>
                  {idx + 1}
                </span>
              )}

              {isHighest && (
                <span className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.9)' }}>● Highest</span>
              )}

              {/* Team logo + name */}
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center font-bold text-sm flex-shrink-0"
                  style={{ backgroundColor: isHighest ? 'rgba(255,255,255,0.2)' : 'var(--color-surface-2)',
                           color: isHighest ? 'white' : 'var(--color-primary)' }}>
                  {team.logoUrl
                    ? <img src={team.logoUrl} alt="" className="w-full h-full object-cover" onError={e => e.target.style.display='none'} />
                    : team.name[0]}
                </div>
                <span className="font-bold text-sm truncate">{team.name}</span>
              </div>

              <div className="text-xs"
                style={{ color: isHighest ? 'rgba(255,255,255,0.75)' : 'var(--color-text-secondary)' }}>
                {formatCurrency(team.remainingBudget)} left
              </div>

              {/* Mini budget bar */}
              <div className="h-1 rounded-full overflow-hidden"
                style={{ backgroundColor: isHighest ? 'rgba(255,255,255,0.2)' : 'var(--color-surface-2)' }}>
                <div className="h-full rounded-full"
                  style={{ width: `${pct}%`,
                           backgroundColor: isHighest ? 'rgba(255,255,255,0.7)' : pct > 80 ? 'var(--color-danger)' : 'var(--color-primary)' }} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   IDLE STAGE
═══════════════════════════════════════════════════════════ */
function IdleStage({ auctionState, availablePlayers, actionLoading, onStart }) {
  return (
    <div className="flex-1 flex flex-col p-4 gap-4">
      <div className="rounded-3xl p-8 text-center flex flex-col items-center gap-3"
        style={{ background: 'linear-gradient(135deg, var(--color-surface), var(--color-surface-2))', border: '1px solid var(--color-border)' }}>
        <Gavel size={52} style={{ color: 'var(--color-primary)', opacity: 0.4 }} />
        <h2 className="text-2xl font-black" style={{ color: 'var(--color-text-primary)' }}>
          {auctionState?.status === 'SOLD'   ? '✅ SOLD! Pick next player' :
           auctionState?.status === 'UNSOLD' ? '❌ UNSOLD. Pick next player' :
           'Select a player to begin'}
        </h2>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {availablePlayers.length} player{availablePlayers.length !== 1 ? 's' : ''} available
        </p>
      </div>

      <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
        Available Players ({availablePlayers.length})
      </p>

      {availablePlayers.length === 0 ? (
        <p className="text-center py-8 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          All players have been auctioned.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
          {availablePlayers.map((player) => {
            const imgUrl = driveImgUrl(player.imageUrl);
            return (
              <button key={player.id} onClick={() => onStart(player)} disabled={actionLoading}
                className="flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200"
                style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                onMouseEnter={e => e.currentTarget.style.borderColor='var(--color-primary)'}
                onMouseLeave={e => e.currentTarget.style.borderColor='var(--color-border)'}>
                <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center font-bold text-xl"
                  style={{ backgroundColor: getRoleBg(player.role), color: getRoleColor(player.role) }}>
                  <PlayerImage imgUrl={imgUrl} name={player.name} roleColor={getRoleColor(player.role)} />
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
  );
}

/* ═══════════════════════════════════════════════════════════
   TEAMS SIDEBAR
═══════════════════════════════════════════════════════════ */
function TeamsSidebar({ teams, auctionState }) {
  return (
    <div className="w-60 xl:w-72 flex-shrink-0 overflow-auto p-3 space-y-2 hidden lg:block"
      style={{ backgroundColor: 'var(--color-surface)', borderLeft: '1px solid var(--color-border)' }}>
      <p className="text-xs font-bold uppercase tracking-widest px-1 mb-3" style={{ color: 'var(--color-text-secondary)' }}>
        Teams
      </p>
      {teams.map((team) => {
        const isHighest = team.id === auctionState?.highestBidderTeamId;
        const pct = team.budget ? ((team.budget - team.remainingBudget) / team.budget) * 100 : 0;
        return (
          <div key={team.id} className="rounded-2xl p-3 transition-all duration-300"
            style={{
              backgroundColor: isHighest ? 'rgba(59,130,246,0.08)' : 'var(--color-surface-2)',
              border: `1.5px solid ${isHighest ? 'var(--color-primary)' : 'var(--color-border)'}`,
              boxShadow: isHighest ? '0 0 12px rgba(59,130,246,0.35)' : 'none',
            }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center font-bold text-sm flex-shrink-0"
                style={{ backgroundColor: isHighest ? 'var(--color-primary)' : 'var(--color-surface)',
                         color: isHighest ? 'white' : 'var(--color-primary)', border: '1px solid var(--color-border)' }}>
                {team.logoUrl
                  ? <img src={team.logoUrl} alt="" className="w-full h-full object-cover" onError={e => e.target.style.display='none'} />
                  : team.name[0]}
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
              <span style={{ color: 'var(--color-text-secondary)' }}>{pct.toFixed(0)}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SOLD OVERLAY
═══════════════════════════════════════════════════════════ */
function SoldOverlay({ name, team, amount }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 animate-fade-in"
      style={{ backgroundColor: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(10px)' }}>
      <div className="animate-sold text-center">
        <div className="text-8xl mb-4">🏏</div>
        <h1 className="font-black uppercase tracking-widest text-shimmer mb-2"
          style={{ fontSize: 'clamp(2.5rem, 8vw, 6rem)' }}>
          SOLD!
        </h1>
        <p className="text-4xl font-black mb-2" style={{ color: 'white' }}>{name}</p>
        <p className="text-2xl font-bold mb-1" style={{ color: 'var(--color-accent)' }}>{team}</p>
        <p className="text-3xl font-black" style={{ color: 'var(--color-success)' }}>{formatCurrency(amount)}</p>
      </div>
    </div>
  );
}
