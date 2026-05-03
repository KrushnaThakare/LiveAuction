import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios';
import { formatCurrency, formatRole, getRoleColor, getRoleBg } from '../utils/formatters';
import { driveImg } from '../utils/driveImage';
import { resolveUrl } from '../utils/resolveUrl';
import SequentialImage from '../components/common/SequentialImage';
import GavelOverlay from '../components/common/GavelOverlay';
import { Gavel, ShieldCheck, Trophy, XCircle, Wifi, ChevronDown, ChevronUp } from 'lucide-react';

async function get(path) {
  const res = await api.get(path);
  return res.data.data;
}

const TABS = ['auction', 'teams', 'sold', 'unsold'];
const TAB_LABELS = { auction: 'Live Auction', teams: 'Teams', sold: 'Sold', unsold: 'Unsold' };
const TAB_ICONS  = { auction: Gavel, teams: ShieldCheck, sold: Trophy, unsold: XCircle };

export default function PublicViewPage() {
  const { tournamentId } = useParams();
  const [tab, setTab]                 = useState('auction');
  const [tournament, setTournament]   = useState(null);
  const [auctionState, setAuction]    = useState(null);
  const [teams, setTeams]             = useState([]);
  const [sold, setSold]               = useState([]);
  const [unsold, setUnsold]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [live, setLive]               = useState(false);
  const [soldOverlay, setSoldOverlay] = useState(null); // { name, team, teamLogo, amount }
  const prevStatus = useRef(null);

  const refreshTeams = useCallback(async () => {
    const tm = await get(`/tournaments/${tournamentId}/teams`);
    setTeams(tm || []);
  }, [tournamentId]);

  const refreshPlayers = useCallback(async () => {
    const [s, u] = await Promise.all([
      get(`/tournaments/${tournamentId}/players?status=SOLD`),
      get(`/tournaments/${tournamentId}/players?status=UNSOLD`),
    ]);
    setSold(s || []);
    setUnsold(u || []);
  }, [tournamentId]);

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

  // Poll auction state every 3 seconds
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const a = await get(`/tournaments/${tournamentId}/auction/state`);
        setAuction(prev => {
          const wasActive = prev?.status === 'ACTIVE';
          if (wasActive && a?.status === 'SOLD') {
            const winnerTeam = teams.find(t => t.id === a.highestBidderTeamId);
            setSoldOverlay({
              verdict:  'SOLD',
              name:     prev.currentPlayer?.name,
              team:     a.highestBidderTeamName,
              teamLogo: resolveUrl(winnerTeam?.logoUrl),
              amount:   a.currentBid,
            });
            setTimeout(() => setSoldOverlay(null), 5200);
            refreshTeams();
            refreshPlayers();
          }
          if (wasActive && a?.status === 'UNSOLD') {
            setSoldOverlay({ verdict: 'UNSOLD', name: prev.currentPlayer?.name });
            setTimeout(() => setSoldOverlay(null), 4200);
          }
          return a;
        });
        setLive(a?.status === 'ACTIVE');
      } catch { /* silent */ }
    }, 3000);
    return () => clearInterval(id);
  }, [tournamentId, teams, refreshTeams, refreshPlayers]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: 'var(--color-background)' }}>
      <div className="text-center">
        <div className="w-10 h-10 rounded-full border-2 animate-spin mx-auto mb-3"
          style={{ borderColor: 'var(--color-border)', borderTopColor: 'var(--color-primary)' }} />
        <p style={{ color: 'var(--color-text-secondary)' }}>Loading…</p>
      </div>
    </div>
  );

  const logoSrc = resolveUrl(tournament?.logoUrl);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-background)', color: 'var(--color-text-primary)' }}>

      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3 shadow-lg sticky top-0 z-10"
        style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
        {logoSrc ? (
          <img src={logoSrc} alt={tournament?.name} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
        ) : (
          <div className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0"
            style={{ background: 'var(--color-primary)', color: 'white' }}>CA</div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="font-black text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>
            {tournament?.name || 'Cricket Auction'}
          </h1>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Broadcast View</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full flex-shrink-0"
          style={{ background: live ? 'rgba(16,185,129,0.15)' : 'rgba(100,116,139,0.15)',
                   color: live ? '#10b981' : '#64748b', border: `1px solid ${live ? '#10b981' : '#334155'}` }}>
          <Wifi size={11} />
          {live ? '● LIVE' : 'Waiting'}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-shrink-0" style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
        {TABS.map(t => {
          const Icon = TAB_ICONS[t];
          const active = tab === t;
          return (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-all"
              style={{ color: active ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                       borderBottom: `2px solid ${active ? 'var(--color-primary)' : 'transparent'}` }}>
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
        {tab === 'sold'    && <PlayerListView players={sold} emptyMsg="No players sold yet" label="Sold" />}
        {tab === 'unsold'  && <PlayerListView players={unsold} emptyMsg="No unsold players yet" label="Unsold" />}
      </div>

      {/* Gavel overlay — same for SOLD and UNSOLD */}
      {soldOverlay && <GavelOverlay {...soldOverlay} duration={soldOverlay.verdict === 'SOLD' ? 5000 : 4000} />}
    </div>
  );
}

/* GavelOverlay handles both SOLD and UNSOLD — imported from components/common */

/* ═══ AUCTION VIEW ═══ */
function AuctionView({ auctionState, teams }) {
  const isActive = auctionState?.status === 'ACTIVE';
  const player   = auctionState?.currentPlayer;

  if (!isActive || !player) {
    return (
      <div className="text-center py-12 max-w-sm mx-auto">
        <Gavel size={48} className="mx-auto mb-4" style={{ color: 'var(--color-text-secondary)', opacity: 0.3 }} />
        <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
          {auctionState?.status === 'SOLD'   ? '✅ Player Sold! Next coming…' :
           auctionState?.status === 'UNSOLD' ? '❌ Unsold. Next coming…' :
           'Auction not started yet'}
        </h2>
        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          Updates every 3 seconds automatically
        </p>
      </div>
    );
  }

  const roleColor = getRoleColor(player.role);
  const roleBg    = getRoleBg(player.role);
  const imgUrl    = driveImg(player.imageUrl);

  return (
    <div className="max-w-lg mx-auto space-y-3">
      {/* Player card */}
      <div className="rounded-3xl overflow-hidden text-center"
        style={{ background: `radial-gradient(circle at 50% 0%, ${roleBg}, var(--color-surface) 70%)`,
                 border: `2px solid ${roleColor}`, boxShadow: `0 0 30px ${roleColor}33` }}>
        <div className="flex justify-center pt-5 pb-2">
          <div className="rounded-2xl overflow-hidden relative flex items-center justify-center"
            style={{ width: 'min(160px,40vw)', height: 'min(180px,45vw)',
                     border: `2px solid ${roleColor}`, background: roleBg }}>
            <SequentialImage src={imgUrl} alt={player.name}
              className="w-full h-full object-cover object-top"
              fallback={
                <span className="absolute inset-0 flex items-center justify-center font-black select-none"
                  style={{ fontSize: '4rem', color: roleColor, opacity: 0.5 }}>{player.name?.[0]}</span>
              } />
          </div>
        </div>
        <div className="px-4 pb-4">
          <h2 className="font-black mb-1 text-shimmer" style={{ fontSize: 'clamp(1.4rem,5vw,2rem)' }}>
            {player.name}
          </h2>
          <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider mb-2"
            style={{ background: roleBg, color: roleColor, border: `1px solid ${roleColor}` }}>
            {formatRole(player.role)}
          </span>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Base: <strong style={{ color: 'var(--color-accent)' }}>{formatCurrency(player.basePrice)}</strong>
          </p>
        </div>
      </div>

      {/* Bid display */}
      <div className="rounded-2xl p-4 text-center"
        style={{ background: 'var(--color-surface)', border: '2px solid var(--color-primary)',
                 boxShadow: '0 0 20px rgba(59,130,246,0.2)' }}>
        <p className="text-xs uppercase tracking-widest font-semibold mb-1"
          style={{ color: 'var(--color-text-secondary)' }}>Current Bid</p>
        <p className="font-black animate-bid-glow" style={{ fontSize: 'clamp(2rem,8vw,3.5rem)',
          color: 'var(--color-primary)', textShadow: '0 0 20px rgba(59,130,246,0.5)' }}>
          {formatCurrency(auctionState.currentBid)}
        </p>
        {auctionState.highestBidderTeamName ? (
          <p className="text-base font-bold mt-1" style={{ color: 'var(--color-accent)' }}>
            🏏 {auctionState.highestBidderTeamName}
          </p>
        ) : (
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>No bids yet</p>
        )}
      </div>

      {/* Team budgets */}
      <div className="grid grid-cols-2 gap-2">
        {teams.map(team => {
          const isHighest = team.id === auctionState.highestBidderTeamId;
          const pct = team.budget ? ((team.budget - team.remainingBudget) / team.budget) * 100 : 0;
          const logoSrc = resolveUrl(team.logoUrl);
          return (
            <div key={team.id} className="rounded-xl p-3"
              style={{ background: isHighest ? 'rgba(59,130,246,0.1)' : 'var(--color-surface)',
                       border: `1.5px solid ${isHighest ? 'var(--color-primary)' : 'var(--color-border)'}`,
                       boxShadow: isHighest ? '0 0 10px rgba(59,130,246,0.3)' : 'none' }}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: isHighest ? 'var(--color-primary)' : 'var(--color-surface-2)',
                           color: isHighest ? 'white' : 'var(--color-primary)' }}>
                  {logoSrc
                    ? <img src={logoSrc} alt="" className="w-full h-full object-cover" onError={e => e.target.style.display='none'} />
                    : team.name[0]}
                </div>
                <p className="text-xs font-bold truncate" style={{ color: isHighest ? 'var(--color-primary)' : 'var(--color-text-primary)' }}>
                  {team.name}
                </p>
              </div>
              <p className="text-xs font-bold" style={{ color: 'var(--color-success)' }}>
                {formatCurrency(team.remainingBudget)} left
              </p>
              <div className="h-1 rounded-full mt-1" style={{ background: 'var(--color-border)' }}>
                <div className="h-full rounded-full"
                  style={{ width: `${pct}%`, background: pct > 80 ? 'var(--color-danger)' : 'var(--color-primary)' }} />
              </div>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                {team.playerCount} players
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══ TEAMS VIEW with squad ═══ */
function TeamsView({ teams }) {
  const [expanded, setExpanded] = useState({});

  const toggle = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }));

  return (
    <div className="space-y-3 max-w-lg mx-auto">
      {teams.map(team => {
        const spent  = team.budget - team.remainingBudget;
        const pct    = team.budget ? (spent / team.budget) * 100 : 0;
        const isOpen = expanded[team.id];
        const logoSrc = resolveUrl(team.logoUrl);
        return (
          <div key={team.id} className="card overflow-hidden">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center font-bold text-lg flex-shrink-0"
                style={{ background: 'var(--color-primary)', color: 'white' }}>
                {logoSrc
                  ? <img src={logoSrc} alt="" className="w-full h-full object-cover" onError={e => e.target.style.display='none'} />
                  : team.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>{team.name}</p>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {team.playerCount} players · Remaining: <strong style={{ color: 'var(--color-success)' }}>{formatCurrency(team.remainingBudget)}</strong>
                </p>
                <div className="h-1.5 rounded-full mt-1.5" style={{ background: 'var(--color-border)' }}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`,
                    background: pct > 80 ? 'var(--color-danger)' : 'var(--color-primary)' }} />
                </div>
              </div>
              {team.playerCount > 0 && (
                <button onClick={() => toggle(team.id)} className="p-1.5 rounded-lg flex-shrink-0"
                  style={{ color: 'var(--color-text-secondary)' }}>
                  {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              )}
            </div>

            {/* Squad list */}
            {isOpen && team.players && team.players.length > 0 && (
              <div className="mt-3 space-y-1.5 pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
                <p className="text-xs font-bold uppercase tracking-wide mb-2"
                  style={{ color: 'var(--color-text-secondary)' }}>Squad</p>
                {team.players.map(p => {
                  const rc  = getRoleColor(p.role);
                  const rbg = getRoleBg(p.role);
                  const imgUrl = driveImg(p.imageUrl);
                  return (
                    <div key={p.id} className="flex items-center gap-2 px-2 py-1.5 rounded-xl"
                      style={{ background: 'var(--color-surface-2)' }}>
                      <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center font-bold text-sm flex-shrink-0 relative"
                        style={{ background: rbg, color: rc }}>
                        <SequentialImage src={imgUrl} alt={p.name}
                          className="w-full h-full object-cover object-top"
                          fallback={<span className="absolute inset-0 flex items-center justify-center">{p.name[0]}</span>} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{p.name}</p>
                        <p className="text-xs" style={{ color: rc }}>{formatRole(p.role)}</p>
                      </div>
                      <span className="text-xs font-bold flex-shrink-0" style={{ color: 'var(--color-accent)' }}>
                        {formatCurrency(p.currentBid)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ═══ PLAYER LIST (Sold / Unsold) ═══ */
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
            <span className="text-xs font-bold w-5 text-right flex-shrink-0" style={{ color: 'var(--color-text-secondary)' }}>
              {i + 1}
            </span>
            <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center font-bold flex-shrink-0 relative"
              style={{ background: rbg, color: rc }}>
              <SequentialImage src={driveImg(p.imageUrl)} alt={p.name}
                className="w-full h-full object-cover object-top"
                fallback={<span className="absolute inset-0 flex items-center justify-center text-base">{p.name[0]}</span>} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>{p.name}</p>
              <p className="text-xs" style={{ color: rc }}>{formatRole(p.role)}</p>
            </div>
            {p.teamName && (
              <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--color-primary)', border: '1px solid var(--color-primary)' }}>
                {p.teamName}
              </span>
            )}
            {p.currentBid > 0 && (
              <span className="text-xs font-bold flex-shrink-0" style={{ color: 'var(--color-sold)' }}>
                {formatCurrency(p.currentBid)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
