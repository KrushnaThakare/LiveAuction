import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Trophy, ChevronRight, CheckCircle, XCircle, Users,
} from 'lucide-react';

export default function AuctionPage() {
  const { activeTournament } = useTournament();
  const navigate = useNavigate();

  const [auctionState, setAuctionState] = useState(null);
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [bidFlash, setBidFlash] = useState(false);
  const containerRef = useRef(null);

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

  // Poll auction state when active
  useEffect(() => {
    if (auctionState?.status !== 'ACTIVE') return;
    const interval = setInterval(async () => {
      if (!activeTournament) return;
      const res = await auctionApi.getState(activeTournament.id);
      setAuctionState(res.data.data);
    }, 3000);
    return () => clearInterval(interval);
  }, [auctionState?.status, activeTournament]);

  const handleStartAuction = async (player) => {
    if (!activeTournament) return;
    setActionLoading(true);
    try {
      const res = await auctionApi.startAuction(activeTournament.id, player.id);
      setAuctionState(res.data.data);
      setAvailablePlayers((p) => p.filter((pl) => pl.id !== player.id));
      if (voiceEnabled) announceAuctionStart(player.name, player.basePrice);
      toast.success(`Auction started for ${player.name}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBid = async (teamId) => {
    if (!activeTournament) return;
    setActionLoading(true);
    try {
      const res = await auctionApi.placeBid(activeTournament.id, teamId);
      setAuctionState(res.data.data);
      setBidFlash(true);
      setTimeout(() => setBidFlash(false), 600);
      const team = teams.find((t) => t.id === teamId);
      if (voiceEnabled && team) announceBid(team.name, res.data.data.currentBid);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSell = async () => {
    if (!activeTournament) return;
    setActionLoading(true);
    try {
      const res = await auctionApi.sellPlayer(activeTournament.id);
      const prev = auctionState;
      setAuctionState(res.data.data);
      if (voiceEnabled) {
        announcePlayerSold(
          prev?.currentPlayer?.name,
          res.data.data.highestBidderTeamName,
          res.data.data.currentBid
        );
      }
      toast.success('Player sold!');
      // Refresh teams budgets
      const teamsRes = await teamApi.getAll(activeTournament.id);
      setTeams(teamsRes.data.data || []);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnsold = async () => {
    if (!activeTournament) return;
    setActionLoading(true);
    try {
      const res = await auctionApi.markUnsold(activeTournament.id);
      const prev = auctionState;
      setAuctionState(res.data.data);
      if (voiceEnabled && prev?.currentPlayer?.name) {
        announcePlayerUnsold(prev.currentPlayer.name);
      }
      toast('Player marked as unsold', { icon: '❌' });
    } finally {
      setActionLoading(false);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
  };

  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  if (!activeTournament) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <EmptyState icon={Gavel} title="No tournament selected" description="Select a tournament to start the auction." />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" text="Loading auction..." />
      </div>
    );
  }

  const isActive = auctionState?.status === 'ACTIVE';
  const isIdle = !isActive;

  return (
    <div
      ref={containerRef}
      className="min-h-screen"
      style={{ backgroundColor: 'var(--color-background)' }}
    >
      {/* Auction Header */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center gap-2">
          <Gavel size={20} style={{ color: 'var(--color-primary)' }} />
          <h1 className="font-bold text-lg" style={{ color: 'var(--color-text-primary)' }}>
            Live Auction
          </h1>
          <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            — {activeTournament.name}
          </span>
          {isActive && (
            <span className="badge-in-auction ml-2">● LIVE</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn-secondary !p-2"
            onClick={() => {
              setVoiceEnabled((v) => {
                if (v) stopSpeaking();
                return !v;
              });
            }}
            title={voiceEnabled ? 'Mute voice' : 'Enable voice'}
          >
            {voiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          <button className="btn-secondary !p-2" onClick={toggleFullscreen} title="Fullscreen">
            {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      <div className="flex h-[calc(100vh-56px)]">
        {/* Main Auction Area */}
        <div className="flex-1 flex flex-col overflow-auto p-4 gap-4">
          {/* Current Player Card */}
          {isActive && auctionState?.currentPlayer ? (
            <AuctionPlayerCard
              player={auctionState.currentPlayer}
              currentBid={auctionState.currentBid}
              nextBid={auctionState.nextBidAmount}
              highestBidderTeamName={auctionState.highestBidderTeamName}
              bidFlash={bidFlash}
            />
          ) : (
            <div
              className="rounded-2xl p-8 text-center flex flex-col items-center gap-3"
              style={{
                background: 'linear-gradient(135deg, var(--color-surface) 0%, var(--color-surface-2) 100%)',
                border: '1px solid var(--color-border)',
              }}
            >
              <Gavel size={48} style={{ color: 'var(--color-text-secondary)' }} />
              <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                {auctionState?.status === 'SOLD' ? 'Player Sold! Pick Next Player →' :
                 auctionState?.status === 'UNSOLD' ? 'Player Unsold. Pick Next Player →' :
                 'Select a player to start the auction'}
              </h2>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {availablePlayers.length} players available
              </p>
            </div>
          )}

          {/* Auction Controls */}
          {isActive && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handleSell}
                disabled={actionLoading || !auctionState?.highestBidderTeamId}
                className="btn-success text-base py-3"
              >
                <CheckCircle size={20} />
                SOLD — {formatCurrency(auctionState?.currentBid)}
              </button>
              <button
                onClick={handleUnsold}
                disabled={actionLoading}
                className="btn-danger text-base py-3"
              >
                <XCircle size={20} />
                Mark UNSOLD
              </button>
            </div>
          )}

          {/* Team Bidding Buttons */}
          {isActive && (
            <div>
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                Place Bid — Next: {formatCurrency(auctionState?.nextBidAmount)}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {teams.map((team) => {
                  const isHighest = team.id === auctionState?.highestBidderTeamId;
                  const canBid = team.remainingBudget >= (auctionState?.nextBidAmount || 0);
                  return (
                    <button
                      key={team.id}
                      onClick={() => handleBid(team.id)}
                      disabled={actionLoading || !canBid}
                      className="relative flex flex-col items-center px-3 py-3 rounded-xl font-medium text-sm transition-all duration-200"
                      style={{
                        backgroundColor: isHighest ? 'var(--color-primary)' : 'var(--color-surface)',
                        border: `2px solid ${isHighest ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        color: isHighest ? 'white' : 'var(--color-text-primary)',
                        opacity: !canBid ? 0.4 : 1,
                        boxShadow: isHighest ? '0 0 15px var(--color-primary)' : 'none',
                      }}
                    >
                      {isHighest && (
                        <span className="absolute -top-1.5 -right-1.5 text-xs px-1.5 py-0.5 rounded-full font-bold"
                          style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}>
                          Highest
                        </span>
                      )}
                      <span className="font-bold truncate w-full text-center">{team.name}</span>
                      <span className="text-xs mt-0.5" style={{ color: isHighest ? 'rgba(255,255,255,0.8)' : 'var(--color-text-secondary)' }}>
                        {formatCurrency(team.remainingBudget)} left
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Available Players to Start Auction */}
          {!isActive && (
            <div>
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                Available Players ({availablePlayers.length})
              </h3>
              {availablePlayers.length === 0 ? (
                <div className="text-center py-6" style={{ color: 'var(--color-text-secondary)' }}>
                  All players have been auctioned.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {availablePlayers.map((player) => (
                    <button
                      key={player.id}
                      onClick={() => handleStartAuction(player)}
                      disabled={actionLoading}
                      className="flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200 hover:-translate-y-0.5"
                      style={{
                        backgroundColor: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--color-border)'}
                    >
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center font-bold flex-shrink-0"
                        style={{ backgroundColor: getRoleBg(player.role), color: getRoleColor(player.role) }}
                      >
                        {player.imageUrl ? (
                          <img src={player.imageUrl} alt={player.name} className="w-full h-full object-cover rounded-lg"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        ) : player.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>
                          {player.name}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                          {formatRole(player.role)} • {formatCurrency(player.basePrice)}
                        </p>
                      </div>
                      <ChevronRight size={16} style={{ color: 'var(--color-text-secondary)' }} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar — Teams */}
        <div
          className="w-64 flex-shrink-0 overflow-auto p-3 space-y-2 hidden lg:block"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderLeft: '1px solid var(--color-border)',
          }}
        >
          <h3 className="text-xs font-semibold uppercase tracking-wide px-2 mb-3"
            style={{ color: 'var(--color-text-secondary)' }}>
            Teams
          </h3>
          {teams.map((team) => {
            const isHighest = team.id === auctionState?.highestBidderTeamId;
            const pct = team.budget ? ((team.budget - team.remainingBudget) / team.budget) * 100 : 0;
            return (
              <div
                key={team.id}
                className="rounded-xl p-3 transition-all duration-200"
                style={{
                  backgroundColor: isHighest ? 'rgba(59,130,246,0.1)' : 'var(--color-surface-2)',
                  border: `1px solid ${isHighest ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  boxShadow: isHighest ? '0 0 10px rgba(59,130,246,0.3)' : 'none',
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
                  >
                    {team.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                      {team.name}
                    </p>
                    {isHighest && (
                      <p className="text-xs" style={{ color: 'var(--color-primary)' }}>● Highest Bid</p>
                    )}
                  </div>
                </div>
                <div className="text-xs flex justify-between mb-1">
                  <span style={{ color: 'var(--color-text-secondary)' }}>Remaining</span>
                  <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                    {formatCurrency(team.remainingBudget)}
                  </span>
                </div>
                <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-border)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: pct > 80 ? 'var(--color-danger)' : 'var(--color-primary)',
                    }}
                  />
                </div>
                <div className="text-xs mt-1 flex justify-between">
                  <span style={{ color: 'var(--color-text-secondary)' }}>{team.playerCount} players</span>
                  <span style={{ color: 'var(--color-text-secondary)' }}>{pct.toFixed(0)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AuctionPlayerCard({ player, currentBid, nextBid, highestBidderTeamName, bidFlash }) {
  const roleColor = getRoleColor(player.role);
  const roleBg = getRoleBg(player.role);

  return (
    <div
      className="rounded-2xl overflow-hidden glow-border transition-all duration-300"
      style={{
        background: 'linear-gradient(135deg, var(--color-surface) 0%, var(--color-surface-2) 100%)',
        border: '2px solid var(--color-primary)',
      }}
    >
      <div className="flex items-center gap-6 p-6">
        {/* Player Image */}
        <div
          className="w-32 h-32 rounded-2xl overflow-hidden flex items-center justify-center text-4xl font-bold flex-shrink-0 shadow-xl"
          style={{ backgroundColor: roleBg, color: roleColor }}
        >
          {player.imageUrl ? (
            <img
              src={player.imageUrl}
              alt={player.name}
              className="w-full h-full object-cover"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : player.name[0]}
        </div>

        {/* Player Info */}
        <div className="flex-1">
          <h2 className="text-3xl font-black mb-1" style={{ color: 'var(--color-text-primary)' }}>
            {player.name}
          </h2>
          <span
            className="text-sm px-3 py-1 rounded-full font-semibold"
            style={{ backgroundColor: roleBg, color: roleColor }}
          >
            {formatRole(player.role)}
          </span>
          <p className="mt-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Base Price: <strong style={{ color: 'var(--color-text-primary)' }}>
              {formatCurrency(player.basePrice)}
            </strong>
          </p>
        </div>

        {/* Bid Area */}
        <div
          className="text-center px-6 py-4 rounded-2xl"
          style={{
            backgroundColor: bidFlash ? 'var(--color-accent)' : 'var(--color-surface-2)',
            transition: 'background-color 0.3s ease',
            border: '1px solid var(--color-border)',
          }}
        >
          <p className="text-xs font-medium uppercase tracking-wide mb-1"
            style={{ color: 'var(--color-text-secondary)' }}>
            Current Bid
          </p>
          <p className="text-4xl font-black glow-text" style={{ color: 'var(--color-primary)' }}>
            {formatCurrency(currentBid)}
          </p>
          {highestBidderTeamName && (
            <p className="text-sm mt-1 font-semibold" style={{ color: 'var(--color-accent)' }}>
              {highestBidderTeamName}
            </p>
          )}
          {!highestBidderTeamName && (
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
              No bids yet
            </p>
          )}
          <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--color-border)' }}>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Next bid</p>
            <p className="text-lg font-bold" style={{ color: 'var(--color-secondary)' }}>
              {formatCurrency(nextBid)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
