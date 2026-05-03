import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import { formatCurrency, formatRole, getRoleColor, getRoleBg } from '../utils/formatters';
import { driveImg } from '../utils/driveImage';
import { resolveUrl } from '../utils/resolveUrl';
import SequentialImage from '../components/common/SequentialImage';
import { Gavel, ShieldCheck, Trophy, XCircle, Wifi } from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8080/api').replace(/\/+$/, '');

async function get(path) {
  const res = await api.get(path);
  return res.data.data;
}

const TABS = ['auction', 'teams', 'sold', 'unsold'];
const TAB_LABELS = { auction: 'Live Auction', teams: 'Teams', sold: 'Sold', unsold: 'Unsold' };
const TAB_ICONS  = { auction: Gavel, teams: ShieldCheck, sold: Trophy, unsold: XCircle };

export default function PublicViewPage() {
  const { tournamentId } = useParams();
  const [tab, setTab]               = useState('auction');
  const [tournament, setTournament] = useState(null);
  const [auctionState, setAuction]  = useState(null);
  const [teams, setTeams]           = useState([]);
  const [sold, setSold]             = useState([]);
  const [unsold, setUnsold]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [live, setLive]             = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [t, a, tm, s, u] = await Promise.all([
        get(`/tournaments/${tournamentId}`),
        get(`/tournaments/${tournamentId}/auction/state`),
        get(`/tournaments/${tournamentId}/teams`),
        get(`/tournaments/${tournamentId}/players?status=SOLD`),
        get(`/tournaments/${tournamentId}/players?status=UNSOLD`),
      ]);
      setTournament(t);
      setAuction(a);
      setTeams(tm || []);
      setSold(s || []);
      setUnsold(u || []);
      setLive(a?.status === 'ACTIVE');
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [tournamentId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Poll auction state every 3s
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const a = await get(`/tournaments/${tournamentId}/auction/state`);
        setAuction(a);
        setLive(a?.status === 'ACTIVE');
      } catch { /* silent */ }
    }, 3000);
    return () => clearInterval(id);
  }, [tournamentId]);

  // Refresh sold/unsold when auction changes
  useEffect(() => {
    if (auctionState?.status === 'SOLD' || auctionState?.status === 'UNSOLD') {
      get(`/tournaments/${tournamentId}/players?status=SOLD`).then(s => setSold(s || []));
      get(`/tournaments/${tournamentId}/players?status=UNSOLD`).then(u => setUnsold(u || []));
      get(`/tournaments/${tournamentId}/teams`).then(t => setTeams(t || []));
    }
  }, [auctionState?.status, tournamentId]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: '#0f172a', color: '#f1f5f9' }}>
      <div className="text-center">
        <div className="w-10 h-10 rounded-full border-2 border-blue-500 border-t-transparent animate-spin mx-auto mb-3" />
        <p>Loading…</p>
      </div>
    </div>
  );

  const logoSrc = resolveUrl(tournament?.logoUrl);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-background)', color: 'var(--color-text-primary)' }}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3 shadow-lg"
        style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
        {logoSrc ? (
          <img src={logoSrc} alt={tournament?.name} className="w-9 h-9 rounded-lg object-cover" />
        ) : (
          <div className="w-9 h-9 rounded-lg flex items-center justify-center font-bold"
            style={{ background: 'var(--color-primary)', color: 'white' }}>
            CA
          </div>
        )}
        <div className="flex-1">
          <h1 className="font-black text-base" style={{ color: 'var(--color-text-primary)' }}>
            {tournament?.name || 'Cricket Auction'}
          </h1>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Broadcast View — Read Only</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full"
          style={{ background: live ? 'rgba(16,185,129,0.15)' : 'rgba(100,116,139,0.15)',
                   color: live ? '#10b981' : '#64748b', border: `1px solid ${live ? '#10b981' : '#334155'}` }}>
          <Wifi size={11} />
          {live ? 'LIVE' : 'Waiting'}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex" style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
        {TABS.map(t => {
          const Icon = TAB_ICONS[t];
          const active = tab === t;
          return (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-all"
              style={{ color: active ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                       borderBottom: active ? '2px solid var(--color-primary)' : '2px solid transparent' }}>
              <Icon size={13} />
              <span className="hidden sm:inline">{TAB_LABELS[t]}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-3">
        {tab === 'auction' && <AuctionView auctionState={auctionState} teams={teams} />}
        {tab === 'teams'   && <TeamsView teams={teams} />}
        {tab === 'sold'    && <PlayerListView players={sold} emptyMsg="No players sold yet" />}
        {tab === 'unsold'  && <PlayerListView players={unsold} emptyMsg="No unsold players yet" />}
      </div>
    </div>
  );
}

/* ── Live Auction view ── */
function AuctionView({ auctionState, teams }) {
  const isActive = auctionState?.status === 'ACTIVE';
  const player   = auctionState?.currentPlayer;

  if (!isActive || !player) {
    return (
      <div className="text-center py-16">
        <Gavel size={52} className="mx-auto mb-4" style={{ color: 'var(--color-text-secondary)', opacity: 0.4 }} />
        <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
          {auctionState?.status === 'SOLD'   ? '✅ Player Sold! Next player coming…' :
           auctionState?.status === 'UNSOLD' ? '❌ Unsold. Next player coming…' :
           'Auction not started yet'}
        </h2>
        <p className="text-sm mt-2" style={{ color: 'var(--color-text-secondary)' }}>
          This page refreshes automatically every 3 seconds
        </p>
      </div>
    );
  }

  const roleColor = getRoleColor(player.role);
  const roleBg    = getRoleBg(player.role);
  const imgUrl    = driveImg(player.imageUrl);

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {/* Player card */}
      <div className="rounded-3xl overflow-hidden text-center"
        style={{ background: `radial-gradient(circle at 50% 0%, ${roleBg}, var(--color-surface) 70%)`,
                 border: `2px solid ${roleColor}`, boxShadow: `0 0 30px ${roleColor}33` }}>
        <div className="flex justify-center pt-6 pb-2">
          <div className="w-36 h-36 rounded-2xl overflow-hidden relative"
            style={{ border: `2px solid ${roleColor}`, background: roleBg }}>
            <SequentialImage src={imgUrl} alt={player.name}
              className="w-full h-full object-cover object-top"
              fallback={
                <span className="absolute inset-0 flex items-center justify-center text-5xl font-black select-none"
                  style={{ color: roleColor, opacity: 0.5 }}>{player.name?.[0]}</span>
              } />
          </div>
        </div>
        <div className="px-4 pb-4">
          <h2 className="font-black text-2xl mb-1" style={{ color: 'var(--color-text-primary)' }}>
            {player.name}
          </h2>
          <span className="inline-block text-xs px-3 py-1 rounded-full font-bold uppercase tracking-widest mb-3"
            style={{ background: roleBg, color: roleColor, border: `1px solid ${roleColor}` }}>
            {formatRole(player.role)}
          </span>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Base: <strong style={{ color: 'var(--color-accent)' }}>{formatCurrency(player.basePrice)}</strong>
          </p>
        </div>
      </div>

      {/* Bid display */}
      <div className="rounded-2xl p-5 text-center"
        style={{ background: 'var(--color-surface)', border: '2px solid var(--color-primary)',
                 boxShadow: '0 0 20px rgba(59,130,246,0.2)' }}>
        <p className="text-xs uppercase tracking-widest font-semibold mb-1"
          style={{ color: 'var(--color-text-secondary)' }}>Current Bid</p>
        <p className="font-black" style={{ fontSize: 'clamp(2rem,8vw,3.5rem)', color: 'var(--color-primary)',
          textShadow: '0 0 20px rgba(59,130,246,0.5)' }}>
          {formatCurrency(auctionState.currentBid)}
        </p>
        {auctionState.highestBidderTeamName ? (
          <p className="text-lg font-bold mt-1" style={{ color: 'var(--color-accent)' }}>
            🏏 {auctionState.highestBidderTeamName}
          </p>
        ) : (
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>No bids yet</p>
        )}
      </div>

      {/* Teams budget grid */}
      <div className="grid grid-cols-2 gap-2">
        {teams.map(team => {
          const isHighest = team.id === auctionState.highestBidderTeamId;
          const pct = team.budget ? ((team.budget - team.remainingBudget) / team.budget) * 100 : 0;
          return (
            <div key={team.id} className="rounded-xl p-3"
              style={{ background: isHighest ? 'rgba(59,130,246,0.1)' : 'var(--color-surface)',
                       border: `1.5px solid ${isHighest ? 'var(--color-primary)' : 'var(--color-border)'}`,
                       boxShadow: isHighest ? '0 0 10px rgba(59,130,246,0.3)' : 'none' }}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: isHighest ? 'var(--color-primary)' : 'var(--color-surface-2)',
                           color: isHighest ? 'white' : 'var(--color-primary)' }}>
                  {team.logoUrl
                    ? <img src={resolveUrl(team.logoUrl)} alt="" className="w-full h-full object-cover" onError={e=>e.target.style.display='none'} />
                    : team.name[0]}
                </div>
                <p className="text-xs font-bold truncate" style={{ color: isHighest ? 'var(--color-primary)' : 'var(--color-text-primary)' }}>
                  {team.name}
                </p>
              </div>
              <p className="text-xs font-bold" style={{ color: 'var(--color-success)' }}>
                {formatCurrency(team.remainingBudget)}
              </p>
              <div className="h-1 rounded-full mt-1" style={{ background: 'var(--color-border)' }}>
                <div className="h-full rounded-full"
                  style={{ width: `${pct}%`, background: pct > 80 ? 'var(--color-danger)' : 'var(--color-primary)' }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TeamsView({ teams }) {
  return (
    <div className="space-y-3 max-w-lg mx-auto">
      {teams.map(team => {
        const spent = team.budget - team.remainingBudget;
        const pct   = team.budget ? (spent / team.budget) * 100 : 0;
        return (
          <div key={team.id} className="card">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center font-bold text-lg flex-shrink-0"
                style={{ background: 'var(--color-primary)', color: 'white' }}>
                {team.logoUrl
                  ? <img src={resolveUrl(team.logoUrl)} alt="" className="w-full h-full object-cover" onError={e=>e.target.style.display='none'} />
                  : team.name[0]}
              </div>
              <div>
                <p className="font-bold" style={{ color: 'var(--color-text-primary)' }}>{team.name}</p>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {team.playerCount} players · {formatCurrency(team.remainingBudget)} left
                </p>
              </div>
            </div>
            <div className="h-1.5 rounded-full" style={{ background: 'var(--color-border)' }}>
              <div className="h-full rounded-full" style={{ width: `${pct}%`,
                background: pct > 80 ? 'var(--color-danger)' : 'var(--color-primary)' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PlayerListView({ players, emptyMsg }) {
  if (!players.length) return (
    <p className="text-center py-12 text-sm" style={{ color: 'var(--color-text-secondary)' }}>{emptyMsg}</p>
  );
  return (
    <div className="space-y-2 max-w-lg mx-auto">
      {players.map((p, i) => {
        const rc  = getRoleColor(p.role);
        const rbg = getRoleBg(p.role);
        return (
          <div key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-xl"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <span className="text-xs font-bold w-5 text-right" style={{ color: 'var(--color-text-secondary)' }}>{i+1}</span>
            <div className="w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center font-bold flex-shrink-0"
              style={{ background: rbg, color: rc }}>
              <SequentialImage src={driveImg(p.imageUrl)} alt={p.name}
                className="w-full h-full object-cover object-top"
                fallback={<span style={{ fontSize: '1.1rem' }}>{p.name[0]}</span>} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>{p.name}</p>
              <p className="text-xs" style={{ color: rc }}>{formatRole(p.role)}</p>
            </div>
            {p.teamName && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--color-primary)' }}>
                {p.teamName}
              </span>
            )}
            {p.currentBid > 0 && (
              <span className="text-xs font-bold" style={{ color: 'var(--color-sold)' }}>
                {formatCurrency(p.currentBid)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
