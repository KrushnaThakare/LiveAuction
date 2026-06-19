import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTournament } from '../contexts/TournamentContext';
import { playerApi } from '../api/players';
import { registrationApi } from '../api/registration';
import { formatCurrency, formatRole, getRoleColor, getRoleBg, getAuctionDisplayName } from '../utils/formatters';
import {
  buildRegistrationIndex,
  buildSoldPlayerContact,
  clearWhatsAppSentIds,
  loadWhatsAppSentIds,
  markPlayerWhatsAppSent,
  maskMobile,
  normalizeWhatsAppPhone,
  openWhatsApp,
} from '../utils/whatsappMessaging';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import WhatsAppBulkModal from '../components/sold/WhatsAppBulkModal';
import toast from 'react-hot-toast';
import { Trophy, Search, MessageCircle, Copy, CheckCircle2 } from 'lucide-react';

export default function SoldPlayersPage() {
  const { activeTournament } = useTournament();
  const [players, setPlayers] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(() => new Set());
  const [sentIds, setSentIds] = useState(() => new Set());
  const [bulkQueue, setBulkQueue] = useState(null);
  const [bulkIndex, setBulkIndex] = useState(0);

  const registrationIndex = useMemo(
    () => buildRegistrationIndex(registrations),
    [registrations]
  );

  const fetchSold = useCallback(async () => {
    if (!activeTournament) return;
    setLoading(true);
    try {
      const [playersRes, regsRes] = await Promise.all([
        playerApi.getAll(activeTournament.id, 'SOLD'),
        registrationApi.getRegistrations(activeTournament.id).catch(() => ({ data: { data: [] } })),
      ]);
      setPlayers(playersRes.data.data || []);
      setRegistrations(regsRes.data.data || []);
      setSentIds(loadWhatsAppSentIds(activeTournament.id));
      setSelected(new Set());
    } finally {
      setLoading(false);
    }
  }, [activeTournament]);

  useEffect(() => { fetchSold(); }, [fetchSold]);

  const contactsByPlayerId = useMemo(() => {
    const map = new Map();
    for (const player of players) {
      map.set(player.id, buildSoldPlayerContact(player, registrationIndex, activeTournament));
    }
    return map;
  }, [players, registrationIndex, activeTournament]);

  const filtered = players.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.teamName || '').toLowerCase().includes(search.toLowerCase())
  );

  const filteredIds = useMemo(() => new Set(filtered.map(p => p.id)), [filtered]);
  const allFilteredSelected = filtered.length > 0 && filtered.every(p => selected.has(p.id));

  const totalSpend = players.reduce((s, p) => s + p.currentBid, 0);
  const withMobileCount = players.filter(p => contactsByPlayerId.get(p.id)?.phone).length;

  const toggleSelect = (playerId) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return next;
    });
  };

  const toggleSelectAllFiltered = () => {
    setSelected(prev => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filtered.forEach(p => next.delete(p.id));
      } else {
        filtered.forEach(p => next.add(p.id));
      }
      return next;
    });
  };

  const startBulkSend = (playerIds) => {
    const queue = [...playerIds]
      .map(id => contactsByPlayerId.get(id))
      .filter(contact => contact?.url);

    if (!queue.length) {
      toast.error('No selected players have a valid mobile number');
      return;
    }

    const skipped = playerIds.length - queue.length;
    if (skipped > 0) {
      toast(`${skipped} selected player(s) skipped — no mobile on file`, { icon: 'ℹ️' });
    }

    setBulkQueue(queue);
    setBulkIndex(0);
  };

  const sendSelectedBulk = () => {
    const ids = [...selected].filter(id => filteredIds.has(id));
    if (!ids.length) {
      toast.error('Select at least one player');
      return;
    }
    startBulkSend(ids);
  };

  const handleCopyNumbers = () => {
    const ids = selected.size ? [...selected].filter(id => filteredIds.has(id)) : filtered.map(p => p.id);
    const phones = ids
      .map(id => contactsByPlayerId.get(id)?.phone)
      .filter(Boolean);
    const unique = [...new Set(phones)];

    if (!unique.length) {
      toast.error('No mobile numbers available to copy');
      return;
    }

    navigator.clipboard.writeText(unique.join(', '));
    toast.success(`Copied ${unique.length} number(s) for WhatsApp broadcast list`);
  };

  const handleClearSentMarks = () => {
    if (!activeTournament) return;
    if (!confirm('Clear all “sent” marks for this tournament?')) return;
    setSentIds(clearWhatsAppSentIds(activeTournament.id));
    toast.success('Sent marks cleared');
  };

  const handleMarkSentAndNext = (playerId) => {
    if (!activeTournament) return;
    setSentIds(prev => markPlayerWhatsAppSent(activeTournament.id, playerId, prev));
    setBulkIndex(i => {
      const next = i + 1;
      if (bulkQueue && next >= bulkQueue.length) {
        toast.success('WhatsApp queue finished');
        setBulkQueue(null);
        return 0;
      }
      return next;
    });
  };

  const handleBulkSkip = () => {
    setBulkIndex(i => {
      const next = i + 1;
      if (bulkQueue && next >= bulkQueue.length) {
        setBulkQueue(null);
        return 0;
      }
      return next;
    });
  };

  if (!activeTournament) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <EmptyState icon={Trophy} title="No tournament selected" />
      </div>
    );
  }

  const tournamentLabel = getAuctionDisplayName(activeTournament, activeTournament.name);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Sold Players
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {tournamentLabel} — {players.length} sold • {withMobileCount} with mobile • Total: {formatCurrency(totalSpend)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <button
          type="button"
          className="btn-primary"
          disabled={!selected.size}
          onClick={sendSelectedBulk}
        >
          <MessageCircle size={15} /> Send WhatsApp to selected ({selected.size})
        </button>
        <button type="button" className="btn-secondary" onClick={handleCopyNumbers}>
          <Copy size={15} /> Copy numbers
        </button>
        <button type="button" className="btn-secondary" onClick={handleClearSentMarks}>
          Clear sent marks
        </button>
      </div>

      <p className="text-xs mb-4" style={{ color: 'var(--color-text-secondary)' }}>
        Manual WhatsApp: opens a pre-filled chat — you still tap Send in WhatsApp for each player.
        Use <strong>Copy numbers</strong> to paste into a WhatsApp Broadcast list.
      </p>

      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-secondary)' }} />
        <input className="input pl-9" placeholder="Search by player or team name..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="py-16 flex justify-center"><LoadingSpinner size="lg" text="Loading sold players..." /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Trophy} title="No sold players" description="Sold players will appear here after the auction." />
      ) : (
        <div className="space-y-2">
          <div
            className="grid grid-cols-12 text-xs font-semibold uppercase tracking-wide px-4 py-2 rounded-lg items-center gap-1"
            style={{ color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-surface-2)' }}
          >
            <div className="col-span-1">
              <input
                type="checkbox"
                checked={allFilteredSelected}
                onChange={toggleSelectAllFiltered}
                aria-label="Select all visible"
              />
            </div>
            <div className="col-span-1">#</div>
            <div className="col-span-3">Player</div>
            <div className="col-span-1">Role</div>
            <div className="col-span-2">Sold</div>
            <div className="col-span-2">Team</div>
            <div className="col-span-1">Mobile</div>
            <div className="col-span-1">WhatsApp</div>
          </div>

          {filtered.map((player, idx) => {
            const roleColor = getRoleColor(player.role);
            const roleBg = getRoleBg(player.role);
            const contact = contactsByPlayerId.get(player.id);
            const hasMobile = Boolean(contact?.phone);
            const isSent = sentIds.has(Number(player.id));
            const isChecked = selected.has(player.id);

            return (
              <div
                key={player.id}
                className="grid grid-cols-12 items-center px-4 py-3 rounded-xl gap-1 transition-all duration-200"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: `1px solid ${isSent ? 'rgba(16,185,129,0.45)' : 'var(--color-border)'}`,
                }}
              >
                <div className="col-span-1">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleSelect(player.id)}
                    aria-label={`Select ${player.name}`}
                  />
                </div>
                <div className="col-span-1 text-sm font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                  {idx + 1}
                </div>
                <div className="col-span-3 flex items-center gap-2 min-w-0">
                  <div
                    className="w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center font-bold text-sm flex-shrink-0"
                    style={{ backgroundColor: roleBg, color: roleColor }}
                  >
                    {player.imageUrl ? (
                      <img src={player.imageUrl} alt={player.name} className="w-full h-full object-cover"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : player.name[0]}
                  </div>
                  <span className="font-semibold text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>
                    {player.name}
                    {isSent && (
                      <CheckCircle2 size={14} className="inline ml-1.5" style={{ color: 'var(--color-success)' }} />
                    )}
                  </span>
                </div>
                <div className="col-span-1">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
                    style={{ backgroundColor: roleBg, color: roleColor }}
                  >
                    {formatRole(player.role)}
                  </span>
                </div>
                <div className="col-span-2 text-sm font-bold" style={{ color: 'var(--color-sold)' }}>
                  {formatCurrency(player.currentBid)}
                </div>
                <div className="col-span-2 min-w-0">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full truncate block text-center"
                    style={{
                      backgroundColor: 'rgba(59,130,246,0.1)',
                      color: 'var(--color-primary)',
                      border: '1px solid var(--color-primary)',
                    }}
                  >
                    {player.teamName || '—'}
                  </span>
                </div>
                <div className="col-span-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {hasMobile ? maskMobile(contact.mobile) : '—'}
                </div>
                <div className="col-span-1">
                  {hasMobile ? (
                    <button
                      type="button"
                      className="btn-secondary !px-2 !py-1.5 text-xs"
                      title="Open WhatsApp"
                      onClick={() => {
                        openWhatsApp(contact.mobile, contact.message);
                        setSentIds(prev => markPlayerWhatsAppSent(activeTournament.id, player.id, prev));
                      }}
                    >
                      <MessageCircle size={14} />
                    </button>
                  ) : (
                    <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }} title="Add mobile via registration or Excel">N/A</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {bulkQueue && (
        <WhatsAppBulkModal
          queue={bulkQueue}
          currentIndex={bulkIndex}
          sentIds={sentIds}
          onMarkSentAndNext={handleMarkSentAndNext}
          onSkip={handleBulkSkip}
          onClose={() => setBulkQueue(null)}
        />
      )}
    </div>
  );
}
