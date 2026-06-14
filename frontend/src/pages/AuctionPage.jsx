import { useState, useEffect, useCallback, useRef } from 'react';
import { useTournament } from '../contexts/TournamentContext';
import { auctionApi } from '../api/auction';
import { playerApi } from '../api/players';
import { teamApi } from '../api/teams';
import { bidRuleApi } from '../api/bidRules';
import {
  announceAuctionStart, announceBid,
  announcePlayerSold, announcePlayerUnsold, stopSpeaking,
} from '../utils/voiceAnnouncement';
import { formatCurrency, formatRole, getRoleColor, getRoleBg, getRoleIcon, getPlayerRoles, getAuctionDisplayName } from '../utils/formatters';
import { driveImg } from '../utils/driveImage';
import { resolveUrl } from '../utils/resolveUrl';
import { matchesPlayerIdOrName, playerIdLabel } from '../utils/playerSearch';
import GavelOverlay from '../components/common/GavelOverlay';
import SequentialImage from '../components/common/SequentialImage';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import toast from 'react-hot-toast';
import {
  Gavel, Maximize2, Minimize2, Volume2, VolumeX,
  ChevronRight, CheckCircle, XCircle, Plus, Minus,
  Keyboard, Shuffle, StopCircle, RefreshCw, Share2, RotateCcw, Search, X,
} from 'lucide-react';

function getDynamicIncrement(rules, amount, fallbackNextBid) {
  if (Array.isArray(rules) && rules.length) {
    const sorted = [...rules].sort((a, b) => Number(a.minAmount || 0) - Number(b.minAmount || 0));
    const rule = sorted.find(r => amount < Number(r.maxAmount)) || sorted[sorted.length - 1];
    return Math.max(1, Number(rule?.incrementAmount || 0));
  }
  return Math.max(1, Number(fallbackNextBid || amount + 1000) - amount);
}

function getBidRevision(auction) {
  const revision = Number(auction?.bidRevision);
  return Number.isFinite(revision) ? revision : null;
}

function isOlderAuctionState(currentAuction, incomingAuction) {
  if (!currentAuction || !incomingAuction) return false;
  if (String(currentAuction.sessionId || '') !== String(incomingAuction.sessionId || '')) return false;
  const currentRevision = getBidRevision(currentAuction);
  const incomingRevision = getBidRevision(incomingAuction);
  return currentRevision != null && incomingRevision != null && incomingRevision < currentRevision;
}

function hasDifferentLiveAuctionValue(a, b) {
  if (!a || !b) return false;
  return (
    Number(a.currentBid) !== Number(b.currentBid) ||
    String(a.highestBidderTeamId || '') !== String(b.highestBidderTeamId || '') ||
    String(a.highestBidderTeamName || '') !== String(b.highestBidderTeamName || '')
  );
}

function publishOverlayAuctionUpdate(tournamentId, auction) {
  if (!tournamentId || !auction) return;
  const payload = {
    type: 'auction-state-updated',
    tournamentId,
    auction,
    sentAt: Date.now(),
  };
  try {
    const channel = new BroadcastChannel('auction-overlay-state');
    channel.postMessage(payload);
    channel.close();
  } catch {
    localStorage.setItem('auction-overlay-state-updated', JSON.stringify(payload));
  }
}

/* ── Image component using sequential loader ── */
function PlayerImage({ imgUrl, name, roleColor }) {
  return (
    <SequentialImage
      src={imgUrl}
      alt={name}
      className="w-full h-full object-cover object-top"
      fallback={
        <span className="absolute inset-0 flex items-center justify-center font-black select-none"
          style={{ fontSize: '5rem', color: roleColor, opacity: 0.5 }}>
          {name?.[0]?.toUpperCase() ?? '?'}
        </span>
      }
    />
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════ */
export default function AuctionPage() {
  const { activeTournament } = useTournament();

  const [auctionState, setAuctionState]         = useState(null);
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [unsoldPlayers, setUnsoldPlayers]       = useState([]);
  const [teams, setTeams]                       = useState([]);
  const [bidRules, setBidRules]                 = useState([]);
  const [loading, setLoading]                   = useState(true);
  const [actionLoading, setActionLoading]       = useState(false);
  const [assigningTeamId, setAssigningTeamId]   = useState(null);
  const [fullscreen, setFullscreen]             = useState(false);
  const [voiceEnabled, setVoiceEnabled]         = useState(true);
  const [bidFlash, setBidFlash]                 = useState(false);
  const [bidKey, setBidKey]                     = useState(0);
  /* proposedBid = number the host has typed/arrowed; null means "not set" */
  const [proposedBid, setProposedBid]           = useState(null);
  const [showKeyHelp, setShowKeyHelp]           = useState(false);
  const [soldOverlay, setSoldOverlay]           = useState(null); // { verdict, name, team, teamLogo, amount }
  const containerRef = useRef(null);
  const bidUpdateSeq = useRef(0);
  const callingBidInFlightRef = useRef(false);
  const pendingCallingBidRef = useRef(null);
  const latestCallingBidRef = useRef(null);
  const pendingCallingBidAuctionRef = useRef(null);
  const assignPromiseRef = useRef(null);
  const debugBidRef = useRef(false);

  useEffect(() => {
    debugBidRef.current = new URLSearchParams(window.location.search).get('debugBid') === '1';
  }, []);

  const logBidSync = useCallback((stage, auction, extra = {}) => {
    if (!debugBidRef.current) return;
    console.debug('[admin-bid-sync]', stage, {
      sessionId: auction?.sessionId,
      bidRevision: auction?.bidRevision,
      currentBid: auction?.currentBid,
      nextBidAmount: auction?.nextBidAmount,
      status: auction?.status,
      at: new Date().toISOString(),
      ...extra,
    });
  }, []);

  const applyServerAuctionState = useCallback((incoming, source = 'server') => {
    setAuctionState(current => {
      const pending = pendingCallingBidAuctionRef.current;

      if (
        pending &&
        incoming &&
        String(incoming.sessionId || '') === String(pending.sessionId || '') &&
        incoming.status === 'ACTIVE' &&
        hasDifferentLiveAuctionValue(incoming, pending)
      ) {
        logBidSync(`${source}-ignored-pending-bid`, incoming, {
          pendingBid: pending.currentBid,
          pendingTeamId: pending.highestBidderTeamId,
          pendingTeamName: pending.highestBidderTeamName,
          pendingRevision: pending.bidRevision,
        });
        return current ? { ...current, ...pending } : pending;
      }

      if (
        pending &&
        incoming &&
        String(incoming.sessionId || '') === String(pending.sessionId || '') &&
        !hasDifferentLiveAuctionValue(incoming, pending)
      ) {
        pendingCallingBidAuctionRef.current = null;
      }

      if (isOlderAuctionState(current, incoming)) {
        logBidSync(`${source}-ignored-stale-revision`, incoming, {
          currentRevision: current?.bidRevision,
        });
        return current;
      }

      logBidSync(`${source}-applied`, incoming);
      return incoming;
    });
  }, [logBidSync]);

  /* ── fetch all data ── */
  const fetchAll = useCallback(async () => {
    if (!activeTournament) return;
    try {
      const [sRes, pRes, uRes, tRes, rRes] = await Promise.all([
        auctionApi.getState(activeTournament.id),
        playerApi.getAll(activeTournament.id, 'AVAILABLE'),
        playerApi.getAll(activeTournament.id, 'UNSOLD'),
        teamApi.getSummary(activeTournament.id),
        bidRuleApi.getRules(activeTournament.id),
      ]);
      applyServerAuctionState(sRes.data.data, 'fetch-all-state');
      setAvailablePlayers(pRes.data.data || []);
      setUnsoldPlayers(uRes.data.data || []);
      setTeams(tRes.data.data || []);
      setBidRules(rRes.data.data || []);
    } finally {
      setLoading(false);
    }
  }, [activeTournament, applyServerAuctionState]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (!activeTournament) return;
    const onStorage = (event) => {
      if (event.key !== 'auction-bid-rules-updated') return;
      if (event.newValue?.startsWith(`${activeTournament.id}:`)) fetchAll();
    };
    window.addEventListener('storage', onStorage);

    let channel;
    try {
      channel = new BroadcastChannel('auction-bid-rules');
      channel.onmessage = (event) => {
        if (event.data?.type === 'rules-updated' && event.data?.tournamentId === activeTournament.id) {
          fetchAll();
        }
      };
    } catch { /* BroadcastChannel is not required for OBS/browser compatibility. */ }

    return () => {
      window.removeEventListener('storage', onStorage);
      channel?.close();
    };
  }, [activeTournament, fetchAll]);

  /* ── poll while active ── */
  useEffect(() => {
    if (auctionState?.status !== 'ACTIVE') return;
    const id = setInterval(async () => {
      if (!activeTournament) return;
      const res = await auctionApi.getState(activeTournament.id);
      applyServerAuctionState(res.data.data, 'poll-response');
    }, 5000);
    return () => clearInterval(id);
  }, [auctionState?.status, activeTournament, applyServerAuctionState]);

  /* ── start specific player ── */
  const handleStartAuction = useCallback(async (player) => {
    if (!activeTournament || actionLoading) return;
    setActionLoading(true);
    try {
      const res = await auctionApi.startAuction(activeTournament.id, player.id);
      setAuctionState(res.data.data);
      publishOverlayAuctionUpdate(activeTournament.id, res.data.data);
      setProposedBid(null);
      setBidKey(k => k + 1);
      setAvailablePlayers(p => p.filter(pl => pl.id !== player.id));
      if (voiceEnabled) announceAuctionStart(player.name, player.basePrice);
      toast.success(`Auction started for ${player.name}`);
    } finally {
      setActionLoading(false);
    }
  }, [activeTournament, actionLoading, voiceEnabled]);

  /* ── start random player ── */
  const handleStartRandom = useCallback(async () => {
    if (!activeTournament || actionLoading) return;
    setActionLoading(true);
    try {
      const res = await auctionApi.startRandom(activeTournament.id);
      const state = res.data.data;
      setAuctionState(state);
      publishOverlayAuctionUpdate(activeTournament.id, state);
      setProposedBid(null);
      setBidKey(k => k + 1);
      if (state.currentPlayer) {
        setAvailablePlayers(p => p.filter(pl => pl.id !== state.currentPlayer.id));
        if (voiceEnabled) announceAuctionStart(state.currentPlayer.name, state.currentPlayer.basePrice);
        toast.success(`Now auctioning: ${state.currentPlayer.name}`);
      }
    } finally {
      setActionLoading(false);
    }
  }, [activeTournament, actionLoading, voiceEnabled]);

  /*
   * ── assign bid to a team ──────────────────────────────────────────
   * Rules:
   *   • If host has set a proposedBid → use that exact amount, then clear it
   *   • If no proposedBid → assign the team at the current committed bid
   * The team button NEVER raises the bid on its own; it only records which team
   * is bidding at the visible price.
   */
  const handleAssignBid = useCallback(async (teamId) => {
    if (!activeTournament || actionLoading || assigningTeamId) return;
    const team = teams.find(t => t.id === teamId);
    const currentBid = auctionState?.currentBid ?? 0;
    const optimisticBid = proposedBid ?? currentBid;
    const previousState = auctionState;
    const optimisticAuction = auctionState ? {
      ...auctionState,
      currentBid: optimisticBid,
      highestBidderTeamId: teamId,
      highestBidderTeamName: team?.name || auctionState.highestBidderTeamName,
      currentPlayer: auctionState.currentPlayer
        ? { ...auctionState.currentPlayer, currentBid: optimisticBid }
        : auctionState.currentPlayer,
    } : null;
    setAssigningTeamId(teamId);
    if (optimisticAuction) {
      pendingCallingBidAuctionRef.current = optimisticAuction;
    }
    setAuctionState(state => state ? ({
      ...state,
      currentBid: optimisticBid,
      highestBidderTeamId: teamId,
      highestBidderTeamName: team?.name || state.highestBidderTeamName,
      currentPlayer: state.currentPlayer ? { ...state.currentPlayer, currentBid: optimisticBid } : state.currentPlayer,
    }) : state);
    if (optimisticAuction) {
      publishOverlayAuctionUpdate(activeTournament.id, optimisticAuction);
    }
    setProposedBid(null);
    setBidFlash(true);
    setBidKey(k => k + 1);
    setTimeout(() => setBidFlash(false), 800);
    try {
      const amount = proposedBid ?? currentBid;
      const request = auctionApi.assignBid(activeTournament.id, teamId, amount);
      assignPromiseRef.current = request;
      const res = await request;
      pendingCallingBidAuctionRef.current = null;
      setAuctionState(res.data.data);
      publishOverlayAuctionUpdate(activeTournament.id, res.data.data);
      setBidKey(k => k + 1);
      if (voiceEnabled && team) announceBid(team.name, res.data.data.currentBid);
    } catch (error) {
      pendingCallingBidAuctionRef.current = null;
      setAuctionState(previousState);
      if (previousState) publishOverlayAuctionUpdate(activeTournament.id, previousState);
      setProposedBid(proposedBid ?? null);
      throw error;
    } finally {
      assignPromiseRef.current = null;
      setAssigningTeamId(null);
    }
  }, [activeTournament, actionLoading, assigningTeamId, proposedBid, voiceEnabled, teams, auctionState]);

  /* ── sell ── */
  const handleSell = useCallback(async () => {
    if (!activeTournament || actionLoading || !auctionState?.highestBidderTeamId) return;
    setActionLoading(true);
    try {
      const prev = auctionState;
      if (assignPromiseRef.current) {
        await assignPromiseRef.current;
      }
      const res = await auctionApi.sellPlayer(activeTournament.id);
      setAuctionState(res.data.data);
      publishOverlayAuctionUpdate(activeTournament.id, res.data.data);
      setProposedBid(null);
      // Find winning team from local state BEFORE refreshing
      const winningTeamId = res.data.data.highestBidderTeamId;
      const winningTeam   = teams.find(t => t.id === winningTeamId);
      setTeams(current => current.map(team => team.id === winningTeamId
        ? {
            ...team,
            remainingBudget: Math.max(0, Number(team.remainingBudget || 0) - Number(res.data.data.currentBid || 0)),
            playerCount: Number(team.playerCount || 0) + 1,
          }
        : team));
      setSoldOverlay({
        verdict:  'SOLD',
        name:     prev?.currentPlayer?.name,
        team:     res.data.data.highestBidderTeamName,
        teamLogo: resolveUrl(winningTeam?.logoUrl) || null,
        amount:   res.data.data.currentBid,
      });
      setTimeout(() => setSoldOverlay(null), 5000);
      if (voiceEnabled) announcePlayerSold(prev?.currentPlayer?.name, res.data.data.highestBidderTeamName, res.data.data.currentBid);
      teamApi.getSummary(activeTournament.id)
        .then(tRes => setTeams(tRes.data.data || []))
        .catch(() => {});
    } finally {
      setActionLoading(false);
    }
  }, [activeTournament, actionLoading, auctionState, voiceEnabled, teams]);

  /* ── unsold ── */
  const handleUnsold = useCallback(async () => {
    if (!activeTournament || actionLoading) return;
    setActionLoading(true);
    try {
      const prev = auctionState;
      const res = await auctionApi.markUnsold(activeTournament.id);
      setAuctionState(res.data.data);
      publishOverlayAuctionUpdate(activeTournament.id, res.data.data);
      setProposedBid(null);
      if (prev?.currentPlayer) {
        const unsoldPlayer = { ...prev.currentPlayer, status: 'UNSOLD', currentBid: 0 };
        setUnsoldPlayers(list => list.some(p => p.id === unsoldPlayer.id) ? list : [unsoldPlayer, ...list]);
        setAvailablePlayers(list => list.filter(p => p.id !== unsoldPlayer.id));
      }
      if (voiceEnabled && prev?.currentPlayer?.name) announcePlayerUnsold(prev.currentPlayer.name);
      setSoldOverlay({ verdict: 'UNSOLD', name: prev?.currentPlayer?.name });
      setTimeout(() => setSoldOverlay(null), 4000);
    } finally {
      setActionLoading(false);
    }
  }, [activeTournament, actionLoading, auctionState, voiceEnabled]);

  /* ── stop auction ── */
  const handleStop = useCallback(async () => {
    if (!activeTournament || actionLoading) return;
    if (!confirm('Stop the current auction? The player will go back to Available.')) return;
    setActionLoading(true);
    try {
      const prev = auctionState;
      const res = await auctionApi.stopAuction(activeTournament.id);
      setAuctionState(res.data.data);
      publishOverlayAuctionUpdate(activeTournament.id, res.data.data);
      if (prev?.currentPlayer) {
        const returnedPlayer = { ...prev.currentPlayer, status: 'AVAILABLE', currentBid: 0 };
        setAvailablePlayers(list => list.some(p => p.id === returnedPlayer.id) ? list : [returnedPlayer, ...list]);
      }
      toast('Auction stopped — player returned to Available', { icon: '⏹' });
    } finally {
      setActionLoading(false);
    }
  }, [activeTournament, actionLoading, auctionState]);

  /* ── undo last sold/unsold decision ── */
  const handleUndo = useCallback(async () => {
    if (!activeTournament || actionLoading) return;
    if (!confirm('Undo the last decision?\n\nThis will:\n• Return the player to Available\n• Restore the team\'s budget (if sold)\n• Remove the player from their squad')) return;
    setActionLoading(true);
    try {
      const res = await auctionApi.undo(activeTournament.id);
      setAuctionState(res.data.data);
      publishOverlayAuctionUpdate(activeTournament.id, res.data.data);
      setSoldOverlay(null);
      toast.success('Decision undone — player returned to Available');
      teamApi.getSummary(activeTournament.id)
        .then(tRes => setTeams(tRes.data.data || []))
        .catch(() => {});
      fetchAll();
    } catch { /* handled */ }
    finally { setActionLoading(false); }
  }, [activeTournament, actionLoading, fetchAll]);

  /* ── re-auction unsold ── */
  const handleReAuction = useCallback(async () => {
    if (!activeTournament || actionLoading) return;
    setActionLoading(true);
    try {
      const res = await auctionApi.reAuctionUnsold(activeTournament.id);
      toast.success(res.data.message);
      fetchAll();
    } finally {
      setActionLoading(false);
    }
  }, [activeTournament, actionLoading, fetchAll]);

  const updateCallingBid = useCallback(async (amount) => {
    if (!activeTournament || !auctionState || auctionState.status !== 'ACTIVE') return;
    const previousState = auctionState;
    const seq = bidUpdateSeq.current + 1;
    bidUpdateSeq.current = seq;
    latestCallingBidRef.current = amount;
    const nextBidAmount = amount + getDynamicIncrement(bidRules, amount, auctionState.nextBidAmount);
    const optimisticAuction = {
      ...auctionState,
      currentBid: amount,
      nextBidAmount,
      highestBidderTeamId: null,
      highestBidderTeamName: null,
      currentPlayer: auctionState.currentPlayer ? { ...auctionState.currentPlayer, currentBid: amount } : auctionState.currentPlayer,
    };
    pendingCallingBidAuctionRef.current = optimisticAuction;

    setAuctionState(state => state ? ({
      ...state,
      currentBid: amount,
      nextBidAmount,
      highestBidderTeamId: null,
      highestBidderTeamName: null,
      currentPlayer: state.currentPlayer ? { ...state.currentPlayer, currentBid: amount } : state.currentPlayer,
    }) : state);
    logBidSync('optimistic-paint', optimisticAuction, { seq });
    publishOverlayAuctionUpdate(activeTournament.id, optimisticAuction);
    setProposedBid(null);
    setBidKey(k => k + 1);

    if (callingBidInFlightRef.current) {
      pendingCallingBidRef.current = amount;
      logBidSync('queued', optimisticAuction, { seq });
      return;
    }

    callingBidInFlightRef.current = true;
    let amountToSend = amount;

    try {
      while (amountToSend != null) {
        pendingCallingBidRef.current = null;
        logBidSync('request', { ...auctionState, currentBid: amountToSend }, { seq });
        const res = await auctionApi.updateCallingBid(activeTournament.id, amountToSend);
        logBidSync('response', res.data.data, { seq });
        const returnedBid = Number(res.data.data?.currentBid);
        if (
          Number(latestCallingBidRef.current) === returnedBid &&
          pendingCallingBidRef.current == null
        ) {
          pendingCallingBidAuctionRef.current = null;
          setAuctionState(res.data.data);
          publishOverlayAuctionUpdate(activeTournament.id, res.data.data);
        }
        amountToSend = pendingCallingBidRef.current;
      }
    } catch (error) {
      if (bidUpdateSeq.current === seq && Number(latestCallingBidRef.current) === Number(amountToSend)) {
        pendingCallingBidAuctionRef.current = null;
        setAuctionState(previousState);
      }
      toast.error('Could not update live overlay bid. Restart backend if this began after the latest update.');
      throw error;
    } finally {
      callingBidInFlightRef.current = false;
    }
  }, [activeTournament, auctionState, bidRules, logBidSync]);

  /* ── bid step helpers ── */
  const stepUp = useCallback(() => {
    const current = proposedBid ?? auctionState?.currentBid ?? 0;
    const step = getDynamicIncrement(bidRules, current, auctionState?.nextBidAmount);
    updateCallingBid(current + step);
  }, [auctionState?.currentBid, auctionState?.nextBidAmount, bidRules, proposedBid, updateCallingBid]);

  const stepDown = useCallback(() => {
    const current = proposedBid ?? auctionState?.currentBid ?? 0;
    const floor = auctionState?.currentPlayer?.basePrice ?? 0;
    const step = getDynamicIncrement(bidRules, Math.max(floor, current - 1), auctionState?.nextBidAmount);
    const next = Math.max(floor, current - step);
    if (next !== current) updateCallingBid(next);
  }, [auctionState?.currentBid, auctionState?.currentPlayer?.basePrice, auctionState?.nextBidAmount, bidRules, proposedBid, updateCallingBid]);

  /* ── fullscreen ── */
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen();
    else document.exitFullscreen();
  }, []);

  /* ── keyboard shortcuts ── */
  useEffect(() => {
    const onKey = (e) => {
      const isActive = auctionState?.status === 'ACTIVE';
      const inInput  = ['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName);

      if (e.key === 'ArrowUp')   { e.preventDefault(); if (isActive) stepUp();   return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); if (isActive) stepDown(); return; }
      if (inInput) return;

      if ((e.key === 's' || e.key === 'S') && isActive && auctionState?.highestBidderTeamId) { handleSell(); return; }
      if ((e.key === 'u' || e.key === 'U') && isActive) { handleUnsold(); return; }
      if ((e.key === 'r' || e.key === 'R') && !isActive) { handleStartRandom(); return; }
      if (e.key === 'm' || e.key === 'M') { setVoiceEnabled(v => { if (v) stopSpeaking(); return !v; }); return; }
      if (e.key === 'f' || e.key === 'F') { toggleFullscreen(); return; }

      const num = parseInt(e.key, 10);
      if (!isNaN(num) && num >= 1 && num <= 9 && isActive) {
        const team = teams[num - 1];
        if (team) handleAssignBid(team.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [auctionState, teams, handleSell, handleUnsold, handleStartRandom, handleAssignBid, stepUp, stepDown, toggleFullscreen]);

  useEffect(() => {
    const h = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);

  if (!activeTournament) {
    return <div className="max-w-6xl mx-auto px-4 py-8">
      <EmptyState icon={Gavel} title="No tournament selected" description="Select a tournament to start the auction." />
    </div>;
  }
  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <LoadingSpinner size="lg" text="Loading auction..." />
    </div>;
  }

  const isActive   = auctionState?.status === 'ACTIVE';
  const displayBid = proposedBid ?? auctionState?.currentBid ?? 0;
  const allDone    = availablePlayers.length === 0 && !isActive && unsoldPlayers.length > 0;
  const playerRoles = getPlayerRoles(activeTournament);
  const auctionTitle = getAuctionDisplayName(activeTournament, activeTournament.name);

  return (
    <div ref={containerRef} className="flex flex-col"
      style={{ minHeight: 'calc(100vh - 56px)', backgroundColor: 'var(--color-background)', position: 'relative' }}>

      {/* ── Top bar ── */}
      <div className="flex-shrink-0 px-4 py-2.5 flex items-center justify-between"
        style={{ backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-3">
          <Gavel size={18} style={{ color: 'var(--color-primary)' }} />
          <span className="font-bold" style={{ color: 'var(--color-text-primary)' }}>Live Auction</span>
          <span className="hidden sm:inline text-sm" style={{ color: 'var(--color-text-secondary)' }}>— {auctionTitle}</span>
          {isActive && <span className="badge-in-auction">● LIVE</span>}
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary !p-2" onClick={() => setShowKeyHelp(v => !v)} title="Shortcuts"><Keyboard size={15} /></button>
          {activeTournament && (
            <button className="btn-secondary !p-2" title="Copy broadcast link (no login needed)"
              onClick={() => {
                const url = `${window.location.origin}/view/${activeTournament.id}`;
                navigator.clipboard.writeText(url);
                toast.success('Broadcast link copied! Share with viewers.');
              }}>
              <Share2 size={15} />
            </button>
          )}
          <button className="btn-secondary !p-2" onClick={() => { setVoiceEnabled(v => { if (v) stopSpeaking(); return !v; }); }}>
            {voiceEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>
          <button className="btn-secondary !p-2" onClick={toggleFullscreen} title="F=Fullscreen">
            {fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>

      {/* ── Key help ── */}
      {showKeyHelp && (
        <div className="flex-shrink-0 px-4 py-2 flex flex-wrap gap-4 text-xs items-center"
          style={{ backgroundColor: 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
          {[['↑↓','Set bid'],['1–9','Assign to team'],['S','Sell'],['U','Unsold'],['R','Random player'],['M','Mute/Unmute'],['F','Fullscreen']].map(([k,v]) => (
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
              <StageCard
                player={auctionState.currentPlayer}
                committedBid={auctionState.currentBid}
                proposedBid={proposedBid}
                highestBidderTeamName={auctionState.highestBidderTeamName}
                bidFlash={bidFlash}
                bidKey={bidKey}
                roles={playerRoles}
              />

              {/* SOLD / UNSOLD / STOP */}
              <div className="flex gap-2 px-4 pb-2">
                <button onClick={handleSell}
                  disabled={actionLoading || !auctionState?.highestBidderTeamId}
                  className="flex-1 btn-success py-3 text-sm font-bold">
                  <CheckCircle size={17} /> SOLD <span className="opacity-50 text-xs">[S]</span>
                </button>
                <button onClick={handleUnsold}
                  disabled={actionLoading}
                  className="flex-1 btn-danger py-3 text-sm font-bold">
                  <XCircle size={17} /> UNSOLD <span className="opacity-50 text-xs">[U]</span>
                </button>
                <button onClick={handleStop}
                  disabled={actionLoading}
                  className="btn-secondary !px-4 py-3 text-sm" title="Stop & return player to Available">
                  <StopCircle size={17} />
                </button>
              </div>

              {/* Bid amount strip */}
              <BidStrip
                proposedBid={proposedBid}
                setProposedBid={setProposedBid}
                setBidKey={setBidKey}
                committedBid={auctionState.currentBid}
                nextBid={auctionState.nextBidAmount}
                onStepUp={stepUp}
                onStepDown={stepDown}
                onCommitBid={updateCallingBid}
                disabled={actionLoading}
              />

              {/* Team assign grid */}
              <TeamAssignGrid
                teams={teams}
                auctionState={auctionState}
                displayBid={displayBid}
                proposedBid={proposedBid}
                onAssign={handleAssignBid}
                disabled={actionLoading || Boolean(assigningTeamId)}
              />
            </>
          ) : (
            <IdleStage
              auctionState={auctionState}
              availablePlayers={availablePlayers}
              unsoldPlayers={unsoldPlayers}
              allDone={allDone}
              actionLoading={actionLoading}
              roles={playerRoles}
              onStart={handleStartAuction}
              onRandom={handleStartRandom}
              onReAuction={handleReAuction}
              onUndo={handleUndo}
            />
          )}
        </div>

        {/* ════ SIDEBAR ════ */}
        <TeamsSidebar teams={teams} auctionState={auctionState} />
      </div>

      {soldOverlay && <GavelOverlay {...soldOverlay} duration={soldOverlay.verdict === 'SOLD' ? 5000 : 4000} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   STAGE CARD
═══════════════════════════════════════════════════════════ */
function StageCard({ player, committedBid, proposedBid, highestBidderTeamName, bidFlash, bidKey, roles }) {
  const roleColor = getRoleColor(player.role, roles);
  const roleBg    = getRoleBg(player.role, roles);
  const imgUrl    = driveImg(player.imageUrl);

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 pt-4 pb-2 gap-3 relative">

      {/* ── Stadium atmosphere background ───────────────────────────────────
          The image is blurred + darkened so it reads as atmosphere, not photo.
          Theme primary colour is blended via a gradient overlay, so it always
          matches the current theme and never clashes with player card content.
      ─────────────────────────────────────────────────────────────────────── */}
      <div aria-hidden="true" style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}>
        {/* Stadium photo — heavily blurred */}
        <div style={{
          position: 'absolute',
          inset: '-10%',      // slightly oversized so edges don't show after blur
          backgroundImage: 'url(/stadium.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center 40%',
          filter: 'blur(18px) saturate(0.7) brightness(0.28)',
          transform: 'scale(1.1)',  // prevent blur edge artifacts
        }} />

        {/* Theme-colour gradient overlay — blends stadium with current theme */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(ellipse 80% 60% at 50% 100%,
              var(--color-background) 0%,
              transparent 70%),
            linear-gradient(
              to bottom,
              var(--color-background) 0%,
              transparent 25%,
              transparent 75%,
              var(--color-background) 100%
            )
          `,
        }} />

        {/* Subtle primary-colour tint so stadium hue matches theme */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse 100% 50% at 50% 50%,
            var(--color-primary-glow, rgba(59,130,246,0.18)) 0%,
            transparent 70%)`,
          mixBlendMode: 'screen',
          opacity: 0.7,
        }} />

        {/* Floodlight rays — thin diagonal lines from top */}
        {[-25, 0, 25].map((angle, i) => (
          <div key={i} style={{
            position: 'absolute',
            top: 0,
            left: `${25 + i * 25}%`,
            width: 1,
            height: '55%',
            background: 'linear-gradient(to bottom, rgba(255,255,255,0.06), transparent)',
            transform: `rotate(${angle}deg)`,
            transformOrigin: 'top center',
          }} />
        ))}
      </div>

      {/* ── All content above the backdrop, z-index 1 ── */}
      <div className="relative z-10 flex flex-col items-center gap-3 w-full">

        {/* Player photo card */}
        <div className="stage-scanlines relative rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center"
          style={{
            width: 'min(260px,34vw)', height: 'min(300px,38vw)', minWidth: 160, minHeight: 190,
            background: `radial-gradient(circle at 50% 55%, ${roleBg} 0%, rgba(0,0,0,0.7) 80%)`,
            border: `3px solid ${roleColor}`,
            boxShadow: `0 0 40px ${roleColor}55, 0 0 80px ${roleColor}22, 0 8px 32px rgba(0,0,0,0.6)`,
          }}>
          <PlayerImage imgUrl={imgUrl} name={player.name} roleColor={roleColor} />
        </div>

        {/* Name */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-black mb-2"
            style={{ color: 'var(--color-accent)', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
            {playerIdLabel(player)}
          </div>
          <h1 className="font-black leading-tight text-shimmer"
            style={{ fontSize: 'clamp(1.6rem,4vw,3rem)', letterSpacing: '-0.02em' }}>
            {player.name}
          </h1>

          <div className="flex items-center justify-center gap-2 mt-2">
            <RoleBadge role={player.role} roleColor={roleColor} roleBg={roleBg} roles={roles} />
          </div>

          <p className="text-sm mt-2" style={{ color: 'var(--color-text-secondary)' }}>
            Base: <span style={{ color: 'var(--color-accent)', fontWeight: 700 }}>{formatCurrency(player.basePrice)}</span>
          </p>
        </div>

        {/* Bid counter */}
        <BidCounter
          committedBid={committedBid}
          proposedBid={proposedBid}
          highestBidderTeamName={highestBidderTeamName}
          bidFlash={bidFlash}
          bidKey={bidKey}
        />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ROLE BADGE — sport-style pill displayed below player name
═══════════════════════════════════════════════════════════ */
function RoleBadge({ role, roleColor, roleBg, roles }) {
  const icon  = getRoleIcon(role, roles);
  const label = formatRole(role, roles);

  return (
    <div
      className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full font-bold tracking-widest uppercase"
      style={{
        fontSize: 'clamp(0.65rem, 1.2vw, 0.8rem)',
        background: `linear-gradient(135deg, ${roleBg} 0%, rgba(0,0,0,0.15) 100%)`,
        color: roleColor,
        border: `1.5px solid ${roleColor}`,
        boxShadow: `0 0 12px ${roleColor}44, inset 0 1px 0 rgba(255,255,255,0.1)`,
        letterSpacing: '0.12em',
      }}
    >
      <span style={{ fontSize: '1rem' }}>{icon}</span>
      {label}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   BID COUNTER — shows proposed (orange) vs committed (blue)
═══════════════════════════════════════════════════════════ */
function BidCounter({ committedBid, proposedBid, highestBidderTeamName, bidFlash, bidKey }) {
  const isProposed  = proposedBid !== null;
  const displayBid  = isProposed ? proposedBid : committedBid;
  const accentColor = isProposed ? 'var(--color-accent)' : 'var(--color-primary)';

  return (
    <div className="w-full max-w-md mx-auto rounded-3xl px-6 py-4 text-center transition-all duration-300"
      style={{
        backgroundColor: bidFlash ? 'rgba(245,158,11,0.1)' : 'var(--color-surface)',
        border: `2px solid ${isProposed ? 'var(--color-accent)' : bidFlash ? 'var(--color-accent)' : 'var(--color-primary)'}`,
        boxShadow: isProposed ? '0 0 24px rgba(245,158,11,0.3)' : '0 0 20px rgba(59,130,246,0.2)',
      }}>
      <p className="text-xs uppercase tracking-widest font-semibold mb-1"
        style={{ color: isProposed ? 'var(--color-accent)' : 'var(--color-text-secondary)' }}>
        {isProposed ? '⬆ Calling Bid' : 'Current Bid'}
      </p>

      <div key={bidKey} className="font-black animate-bid-count"
        style={{ fontSize: 'clamp(2.4rem,6vw,4rem)', color: accentColor, lineHeight: 1,
          textShadow: `0 0 20px ${accentColor}66` }}>
        {formatCurrency(displayBid)}
      </div>

      {isProposed ? (
        <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--color-accent)' }}>
          Click a team to confirm at this price
        </p>
      ) : highestBidderTeamName ? (
        <p className="mt-2 font-bold text-base" style={{ color: 'var(--color-accent)' }}>
          🏏 {highestBidderTeamName}
        </p>
      ) : (
        <p className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          No bids yet
        </p>
      )}

      {isProposed && committedBid > 0 && (
        <div className="mt-2 pt-2 text-xs" style={{ borderTop: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
          Last confirmed: <strong style={{ color: 'var(--color-primary)' }}>{formatCurrency(committedBid)}</strong>
          {highestBidderTeamName && <span style={{ color: 'var(--color-accent)' }}> ({highestBidderTeamName})</span>}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   BID AMOUNT STRIP — arrows + input
═══════════════════════════════════════════════════════════ */
function BidStrip({ proposedBid, setProposedBid, setBidKey, committedBid, nextBid, onStepUp, onStepDown, onCommitBid, disabled }) {
  const handleInputChange = (e) => {
    const v = e.target.value;
    if (v === '') { setProposedBid(null); return; }
    const n = parseFloat(v);
    if (!isNaN(n)) { setProposedBid(n); setBidKey(k => k + 1); }
  };
  const handleInputKey = (e) => {
    if (e.key === 'ArrowUp')   { e.preventDefault(); onStepUp();   }
    if (e.key === 'ArrowDown') { e.preventDefault(); onStepDown(); }
    if (e.key === 'Enter' && proposedBid !== null) {
      e.preventDefault();
      onCommitBid(proposedBid);
    }
  };
  const handleInputBlur = () => {
    if (proposedBid !== null) onCommitBid(proposedBid);
  };

  return (
    <div className="px-4 pb-2">
      <div className="rounded-2xl p-3 flex items-center gap-2"
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <span className="text-xs font-bold whitespace-nowrap" style={{ color: 'var(--color-text-secondary)' }}>
          Calling Amount
        </span>
        <button onClick={onStepDown} disabled={disabled || !proposedBid} className="btn-secondary !p-2 flex-shrink-0">
          <Minus size={14} />
        </button>
        <input type="number" className="input text-center font-bold !py-1.5 flex-1"
          placeholder={`${nextBid} (auto-step)`}
          value={proposedBid ?? ''}
          min={committedBid + 1}
          step={Math.max(1, (nextBid || committedBid + 1000) - committedBid)}
          onChange={handleInputChange}
          onKeyDown={handleInputKey}
          onBlur={handleInputBlur}
          disabled={disabled} />
        <button onClick={onStepUp} disabled={disabled} className="btn-secondary !p-2 flex-shrink-0">
          <Plus size={14} />
        </button>
        {proposedBid !== null && (
          <button onClick={() => { setProposedBid(null); setBidKey(k => k + 1); }}
            className="text-xs px-2 py-1 rounded-lg flex-shrink-0"
            style={{ color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-surface-2)' }}>
            Auto
          </button>
        )}
      </div>
      <p className="text-xs mt-1 px-1" style={{ color: 'var(--color-text-secondary)' }}>
        ↑↓ to call an amount → click a team to confirm → SOLD to finalise
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TEAM ASSIGN GRID
   Clicking a team ONLY records "this team bids at displayBid".
   It never auto-increments on its own.
═══════════════════════════════════════════════════════════ */
function TeamAssignGrid({ teams, auctionState, displayBid, proposedBid, onAssign, disabled }) {
  return (
    <div className="px-4 pb-4">
      <p className="text-xs font-semibold mb-2 flex items-center gap-2"
        style={{ color: 'var(--color-text-secondary)' }}>
        <span>{proposedBid !== null ? '→ Confirm bid at' : 'Assign bidder at'}</span>
        <span style={{ color: proposedBid !== null ? 'var(--color-accent)' : 'var(--color-primary)', fontWeight: 700 }}>
          {formatCurrency(displayBid)}
        </span>
        <span className="ml-auto opacity-60">Keys 1–9</span>
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
        {teams.map((team, idx) => {
          const isHighest = team.id === auctionState?.highestBidderTeamId;
          const canBid    = team.remainingBudget >= displayBid;
          const pct       = team.budget ? ((team.budget - team.remainingBudget) / team.budget) * 100 : 0;

          return (
            <button key={team.id} onClick={() => onAssign(team.id)}
              disabled={disabled || !canBid}
              className="relative flex flex-col gap-1 px-3 py-3 rounded-2xl font-medium transition-all duration-200 text-left active:scale-95"
              style={{
                backgroundColor: isHighest ? 'var(--color-primary)' : 'var(--color-surface)',
                border: `2px solid ${isHighest ? 'var(--color-primary)' : 'var(--color-border)'}`,
                color: isHighest ? 'white' : 'var(--color-text-primary)',
                opacity: !canBid ? 0.3 : 1,
                boxShadow: isHighest ? '0 0 20px var(--color-primary)' : 'none',
                animation: isHighest ? 'teamHighlight 1.2s ease-in-out infinite' : 'none',
              }}>
              {idx < 9 && (
                <span className="absolute top-2 right-2 text-xs w-5 h-5 rounded flex items-center justify-center font-mono font-bold"
                  style={{ backgroundColor: isHighest ? 'rgba(255,255,255,0.2)' : 'var(--color-surface-2)',
                           color: isHighest ? 'white' : 'var(--color-text-secondary)' }}>
                  {idx + 1}
                </span>
              )}
              {isHighest && <span className="text-xs font-bold opacity-90">● Highest Bid</span>}
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center font-bold text-sm flex-shrink-0"
                  style={{ backgroundColor: isHighest ? 'rgba(255,255,255,0.2)' : 'var(--color-surface-2)',
                           color: isHighest ? 'white' : 'var(--color-primary)' }}>
                  {team.logoUrl
                    ? <img src={resolveUrl(team.logoUrl)} alt="" className="w-full h-full object-cover" onError={e => e.target.style.display='none'} />
                    : team.name[0]}
                </div>
                <span className="font-bold text-sm truncate">{team.name}</span>
              </div>
              <div className="text-xs" style={{ color: isHighest ? 'rgba(255,255,255,0.75)' : 'var(--color-text-secondary)' }}>
                {formatCurrency(team.remainingBudget)} left
              </div>
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
   IDLE STAGE — between players
═══════════════════════════════════════════════════════════ */
function IdleStage({ auctionState, availablePlayers, unsoldPlayers, allDone,
                     actionLoading, roles, onStart, onRandom, onReAuction, onUndo }) {
  const canUndo = auctionState?.undoable;
  const [playerSearch, setPlayerSearch] = useState('');
  const filteredAvailablePlayers = availablePlayers.filter(player => matchesPlayerIdOrName(player, playerSearch));

  return (
    <div className="flex-1 flex flex-col p-4 gap-4">
      {/* Status banner — stadium atmosphere background */}
      <div className="rounded-3xl p-6 text-center flex flex-col items-center gap-3 relative overflow-hidden"
        style={{ border: '1px solid var(--color-border)' }}>
        {/* Stadium blur behind banner */}
        <div aria-hidden="true" style={{ position:'absolute',inset:0,zIndex:0,overflow:'hidden',borderRadius:'inherit',pointerEvents:'none' }}>
          <div style={{ position:'absolute',inset:'-10%',backgroundImage:'url(/stadium.jpg)',backgroundSize:'cover',backgroundPosition:'center 40%',filter:'blur(22px) saturate(0.5) brightness(0.18)',transform:'scale(1.1)' }} />
          <div style={{ position:'absolute',inset:0,background:'linear-gradient(135deg,var(--color-surface,rgba(15,25,50,0.92)) 0%,var(--color-surface-2,rgba(20,35,70,0.88)) 100%)',opacity:0.88 }} />
        </div>
        {/* Content above stadium bg */}
        <div className="relative z-10 flex flex-col items-center gap-3">
        <Gavel size={48} style={{ color: 'var(--color-primary)', opacity: 0.55 }} />
        <h2 className="text-2xl font-black" style={{ color: 'var(--color-text-primary)' }}>
          {auctionState?.status === 'SOLD'   ? '✅ SOLD! Select next player' :
           auctionState?.status === 'UNSOLD' ? '❌ UNSOLD. Select next player' :
           'Ready to start — pick a player'}
        </h2>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {availablePlayers.length} available · {unsoldPlayers.length} unsold
        </p>

        {/* Action buttons */}
        <div className="flex gap-3 flex-wrap justify-center mt-1">
          {availablePlayers.length > 0 && (
            <button onClick={onRandom} disabled={actionLoading} className="btn-primary">
              <Shuffle size={16} /> Random Player <span className="opacity-60 text-xs">[R]</span>
            </button>
          )}
          {allDone && (
            <button onClick={onReAuction} disabled={actionLoading} className="btn-secondary">
              <RefreshCw size={16} /> Re-auction {unsoldPlayers.length} Unsold
            </button>
          )}
          {canUndo && (
            <button onClick={onUndo} disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all"
              style={{ backgroundColor: 'rgba(245,158,11,0.1)', color: 'var(--color-warning)',
                       border: '1.5px solid var(--color-warning)' }}
              title="Undo last sold/unsold decision">
              <RotateCcw size={15} /> Undo Last Decision
            </button>
          )}
        </div>
        </div>{/* end z-10 content */}
      </div>

      {/* Available players list */}
      {availablePlayers.length > 0 && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
              Available Players ({filteredAvailablePlayers.length}/{availablePlayers.length})
            </p>
            <div className="relative w-full sm:w-80">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--color-text-secondary)' }} />
              <input
                className="input pl-9 pr-9 h-10 text-sm"
                placeholder="Search ID or name..."
                value={playerSearch}
                onChange={e => setPlayerSearch(e.target.value)}
              />
              {playerSearch && (
                <button
                  type="button"
                  onClick={() => setPlayerSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-md"
                  style={{ color: 'var(--color-text-secondary)' }}
                  title="Clear search">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
          {filteredAvailablePlayers.length === 0 ? (
            <div className="rounded-xl p-4 text-sm text-center"
              style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
              No available player found for this ID or name.
            </div>
          ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {filteredAvailablePlayers.map(player => {
              const imgUrl = driveImg(player.imageUrl);
              return (
                <button key={player.id} onClick={() => onStart(player)} disabled={actionLoading}
                  className="flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200"
                  style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor='var(--color-primary)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor='var(--color-border)'}>
                  <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 relative flex items-center justify-center"
                    style={{ backgroundColor: getRoleBg(player.role, roles) }}>
                    <PlayerImage imgUrl={imgUrl} name={player.name} roleColor={getRoleColor(player.role, roles)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>{player.name}</p>
                    <p className="text-[10px] font-black uppercase" style={{ color: 'var(--color-accent)' }}>
                      {playerIdLabel(player)}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      {formatRole(player.role, roles)} · {formatCurrency(player.basePrice)}
                    </p>
                  </div>
                  <ChevronRight size={15} style={{ color: 'var(--color-text-secondary)', flexShrink: 0 }} />
                </button>
              );
            })}
          </div>
          )}
        </>
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
      {teams.map(team => {
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
                {team.logoUrl ? <img src={resolveUrl(team.logoUrl)} alt="" className="w-full h-full object-cover" onError={e=>e.target.style.display='none'}/> : team.name[0]}
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
              <div className="h-full rounded-full transition-all"
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

/* SoldOverlay is replaced by GavelOverlay component */
