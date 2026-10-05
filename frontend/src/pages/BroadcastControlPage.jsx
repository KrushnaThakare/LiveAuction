import { useEffect, useRef, useState } from 'react';
import { useTournament } from '../contexts/TournamentContext';
import { broadcastApi } from '../api/broadcast';
import { bidRuleApi } from '../api/bidRules';
import toast from 'react-hot-toast';
import SquadSizeInput from '../components/common/SquadSizeInput';
import { clampSquadSize } from '../utils/squadFormation';

function ToggleRow({ label, hint, checked, onChange }) {
  return (
    <label className="flex items-start gap-2.5 py-1.5 cursor-pointer text-sm">
      <input type="checkbox" className="mt-0.5" checked={checked} onChange={onChange} />
      <span className="min-w-0">
        <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{label}</span>
        {hint ? (
          <span className="block text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{hint}</span>
        ) : null}
      </span>
    </label>
  );
}

export default function BroadcastControlPage() {
  const { activeTournament } = useTournament();
  const tid = activeTournament?.id;
  const [settings, setSettings] = useState({
    overlayEnabled: true,
    overlayTheme: 'classic',
    overlayShowTeamBudget: true,
    overlayShowTeamList: true,
    overlayShowTicker: true,
    overlayShowPlayerStatsIntro: true,
    overlayPlayerStatsIntroMs: 5500,
    publicViewShowTeams: true,
    publicViewShowSold: true,
    publicViewShowUnsold: true,
    overlayAudienceDetailFields: ['', ''],
    overlayMainDetailFields: ['', ''],
    overlayShowRecordBreak: true,
    overlayCountdownSeconds: 5,
    tokenEnabled: false,
    overlaySecretToken: '',
  });
  const [bidRules, setBidRules] = useState([]);
  const squadSizeInputRef = useRef(null);

  useEffect(() => {
    if (!tid) return;
    broadcastApi.getSettings(tid).then((r) => {
      const loaded = r.data.data || {};
      setSettings((s) => ({
        ...s,
        ...loaded,
        overlayEnabled: loaded.overlayEnabled !== false,
        maxSquadSize: clampSquadSize(loaded.maxSquadSize),
        overlaySecretToken: loaded.overlaySecretToken || '',
        publicViewShowTeams: loaded.publicViewShowTeams !== false,
        publicViewShowSold: loaded.publicViewShowSold !== false,
        publicViewShowUnsold: loaded.publicViewShowUnsold !== false,
        overlayAudienceDetailFields: [
          loaded.overlayAudienceDetailFields?.[0] || '',
          loaded.overlayAudienceDetailFields?.[1] || '',
        ],
        overlayMainDetailFields: [
          loaded.overlayMainDetailFields?.[0] || '',
          loaded.overlayMainDetailFields?.[1] || '',
        ],
      }));
    });
    bidRuleApi.getRules(tid).then(r => setBidRules(r.data.data || []));
  }, [tid]);

  const save = async () => {
    if (!tid) return;
    const committedSquadSize = squadSizeInputRef.current?.commit?.() ?? clampSquadSize(settings.maxSquadSize);
    const payload = {
      ...settings,
      maxSquadSize: clampSquadSize(committedSquadSize),
      overlayAudienceDetailFields: (settings.overlayAudienceDetailFields || [])
        .map((value) => String(value || '').trim())
        .filter(Boolean)
        .slice(0, 2),
      overlayMainDetailFields: (settings.overlayMainDetailFields || [])
        .map((value) => String(value || '').trim())
        .filter(Boolean)
        .slice(0, 2),
    };
    await broadcastApi.updateSettings(tid, payload);
    setSettings(payload);
    await bidRuleApi.updateRules(tid, bidRules);
    try {
      const channel = new BroadcastChannel('auction-bid-rules');
      channel.postMessage({ tournamentId: tid, type: 'rules-updated' });
      channel.close();
    } catch {
      localStorage.setItem('auction-bid-rules-updated', `${tid}:${Date.now()}`);
    }
    toast.success('Broadcast settings saved');
  };

  const setRule = (idx, key, value) => setBidRules(rules => rules.map((rule, i) => i === idx ? { ...rule, [key]: Number(value) } : rule));
  const addRule = () => setBidRules(rules => [...rules, { minAmount: 0, maxAmount: 0, incrementAmount: 1000, position: rules.length }]);
  const removeRule = (idx) => setBidRules(rules => rules.filter((_, i) => i !== idx));

  const setAudienceField = (index, value) => setSettings((s) => {
    const next = [...(s.overlayAudienceDetailFields || ['', ''])];
    next[index] = value;
    return { ...s, overlayAudienceDetailFields: next };
  });
  const setMainField = (index, value) => setSettings((s) => {
    const next = [...(s.overlayMainDetailFields || ['', ''])];
    next[index] = value;
    return { ...s, overlayMainDetailFields: next };
  });

  const base = window.location.origin;
  const tokenQ = settings.tokenEnabled && settings.overlaySecretToken ? `&token=${encodeURIComponent(settings.overlaySecretToken)}` : '';
  const links = [
    ['Main', `${base}/overlay/main?tournamentId=${tid}${tokenQ}`],
    ['Team Budget', `${base}/overlay/team-budget?tournamentId=${tid}${tokenQ}`],
    ['Team Squad', `${base}/overlay/team-squad?tournamentId=${tid}${tokenQ}`],
    ['Team Squad Board', `${base}/overlay/team-squad-board?tournamentId=${tid}${tokenQ}`],
    ['Audience Display', `${base}/auction-display?tournamentId=${tid}${tokenQ}`],
    ['Ticker', `${base}/overlay/ticker?tournamentId=${tid}${tokenQ}`],
    ['Sold Screen', `${base}/overlay/sold?tournamentId=${tid}${tokenQ}`],
    ['Unsold Screen', `${base}/overlay/unsold?tournamentId=${tid}${tokenQ}`],
    ['Break Screen', `${base}/overlay/break-screen?tournamentId=${tid}${tokenQ}`],
    ['Top 5 Sold', `${base}/overlay/top-sold?tournamentId=${tid}${tokenQ}`],
  ];

  if (!tid) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <p>Select tournament first.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Broadcast Control</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            Overlay scenes, public /view tabs, bid rules, and OBS links for this tournament.
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={save}>Save all settings</button>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <section className="card p-4 space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>Core</h2>
          <ToggleRow
            label="Broadcaster mode enabled"
            hint="Disables public /view link and reduces fan-out when off. Studio overlays still work."
            checked={settings.overlayEnabled !== false}
            onChange={(e) => setSettings(s => ({ ...s, overlayEnabled: e.target.checked }))}
          />
          <div>
            <span className="text-sm font-medium">Maximum squad size</span>
            <SquadSizeInput
              ref={squadSizeInputRef}
              value={settings.maxSquadSize}
              onChange={(maxSquadSize) => setSettings((s) => ({ ...s, maxSquadSize }))}
            />
          </div>
          <ToggleRow
            label="Overlay access token"
            checked={!!settings.tokenEnabled}
            onChange={(e) => setSettings(s => ({ ...s, tokenEnabled: e.target.checked }))}
          />
          {settings.tokenEnabled && (
            <input
              className="input"
              value={settings.overlaySecretToken || ''}
              onChange={e => setSettings(s => ({ ...s, overlaySecretToken: e.target.value }))}
              placeholder="Secret token for overlay URLs"
            />
          )}
        </section>

        <section className="card p-4 space-y-2">
          <h2 className="text-sm font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-secondary)' }}>Public /view tabs</h2>
          <p className="text-xs mb-2" style={{ color: 'var(--color-text-secondary)' }}>
            Share: <code className="text-xs">{`${base}/view/${tid}`}</code>
          </p>
          <div className="grid sm:grid-cols-3 gap-1">
            <ToggleRow label="Teams" checked={settings.publicViewShowTeams !== false} onChange={e => setSettings(s => ({ ...s, publicViewShowTeams: e.target.checked }))} />
            <ToggleRow label="Sold" checked={settings.publicViewShowSold !== false} onChange={e => setSettings(s => ({ ...s, publicViewShowSold: e.target.checked }))} />
            <ToggleRow label="Unsold" checked={settings.publicViewShowUnsold !== false} onChange={e => setSettings(s => ({ ...s, publicViewShowUnsold: e.target.checked }))} />
          </div>
        </section>

        <section className="card p-4">
          <h2 className="text-sm font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-secondary)' }}>Overlay modules</h2>
          <div className="grid sm:grid-cols-2 gap-x-4">
            <ToggleRow label="Team budget" checked={!!settings.overlayShowTeamBudget} onChange={e => setSettings(s => ({ ...s, overlayShowTeamBudget: e.target.checked }))} />
            <ToggleRow label="Team list" checked={!!settings.overlayShowTeamList} onChange={e => setSettings(s => ({ ...s, overlayShowTeamList: e.target.checked }))} />
            <ToggleRow label="Ticker" checked={!!settings.overlayShowTicker} onChange={e => setSettings(s => ({ ...s, overlayShowTicker: e.target.checked }))} />
            <ToggleRow label="Bid amount pop" checked={settings.overlayShowBidPop !== false} onChange={e => setSettings(s => ({ ...s, overlayShowBidPop: e.target.checked }))} />
            <ToggleRow label="Main player transition" checked={settings.overlayShowPlayerTransition !== false} onChange={e => setSettings(s => ({ ...s, overlayShowPlayerTransition: e.target.checked }))} />
            <ToggleRow label="CricHeroes stats intro" checked={settings.overlayShowPlayerStatsIntro !== false} onChange={e => setSettings(s => ({ ...s, overlayShowPlayerStatsIntro: e.target.checked }))} />
            <ToggleRow label="Cinematic intro (Audience)" checked={!!settings.overlayShowCinematicIntro} onChange={e => setSettings(s => ({ ...s, overlayShowCinematicIntro: e.target.checked }))} />
            <ToggleRow label="Squad formation animation" checked={!!settings.overlayShowSquadFormation} onChange={e => setSettings(s => ({ ...s, overlayShowSquadFormation: e.target.checked }))} />
            <ToggleRow label="Record-break animation" checked={settings.overlayShowRecordBreak !== false} onChange={e => setSettings(s => ({ ...s, overlayShowRecordBreak: e.target.checked }))} />
          </div>
          {settings.overlayShowPlayerStatsIntro !== false && (
            <label className="block mt-3 text-sm">
              Stats intro (seconds)
              <input
                className="input mt-1"
                type="number"
                min="1"
                max="15"
                step="0.5"
                value={(Number(settings.overlayPlayerStatsIntroMs || 5500) / 1000).toString()}
                onChange={e => setSettings(s => ({ ...s, overlayPlayerStatsIntroMs: Math.round(Number(e.target.value || 5.5) * 1000) }))}
              />
            </label>
          )}
          <label className="block mt-3 text-sm">
            Countdown duration (Audience)
            <select
              className="input mt-1"
              value={settings.overlayCountdownSeconds || 5}
              onChange={e => setSettings(s => ({ ...s, overlayCountdownSeconds: Number(e.target.value) }))}
            >
              <option value={5}>5 seconds</option>
              <option value={10}>10 seconds</option>
              <option value={15}>15 seconds</option>
            </select>
          </label>
        </section>

        <section className="card p-4 space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>Overlay detail fields</h2>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            Up to two Excel extra column headers per screen. Blank = auto mapping.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <p className="text-xs font-semibold">Audience Display</p>
              <input className="input" placeholder="Field 1" value={settings.overlayAudienceDetailFields?.[0] || ''} onChange={e => setAudienceField(0, e.target.value)} />
              <input className="input" placeholder="Field 2" value={settings.overlayAudienceDetailFields?.[1] || ''} onChange={e => setAudienceField(1, e.target.value)} />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold">Main overlay (OBS)</p>
              <input className="input" placeholder="Field 1" value={settings.overlayMainDetailFields?.[0] || ''} onChange={e => setMainField(0, e.target.value)} />
              <input className="input" placeholder="Field 2" value={settings.overlayMainDetailFields?.[1] || ''} onChange={e => setMainField(1, e.target.value)} />
            </div>
          </div>
        </section>

        <section className="card p-4 lg:col-span-2 space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>Bid rule engine</h2>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>Continuous ranges per tournament (e.g. 0–10000, 10001–50000).</p>
            </div>
            <button type="button" className="btn-secondary text-sm" onClick={addRule}>Add rule</button>
          </div>
          <div className="space-y-2">
            {bidRules.map((rule, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                <input className="input" type="number" value={rule.minAmount ?? 0} onChange={e => setRule(idx, 'minAmount', e.target.value)} placeholder="Min" />
                <input className="input" type="number" value={rule.maxAmount ?? 0} onChange={e => setRule(idx, 'maxAmount', e.target.value)} placeholder="Max" />
                <input className="input" type="number" value={rule.incrementAmount ?? 0} onChange={e => setRule(idx, 'incrementAmount', e.target.value)} placeholder="Step" />
                <button type="button" className="btn-secondary text-sm" onClick={() => removeRule(idx)}>Delete</button>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="card p-4 mt-4">
        <h2 className="text-sm font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-secondary)' }}>OBS / browser sources</h2>
        <p className="text-xs mb-3" style={{ color: 'var(--color-text-secondary)' }}>
          Top 5 Sold is break-only — open when needed; list is cached on load.
        </p>
        <div className="grid md:grid-cols-2 gap-3">
          {links.map(([name, url]) => (
            <div key={name} className="rounded-xl p-3" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
              <p className="font-semibold text-sm mb-1.5">{name}</p>
              <input readOnly className="input w-full text-xs mb-2" value={url} />
              <div className="flex gap-2">
                <button type="button" className="btn-secondary text-xs" onClick={() => navigator.clipboard.writeText(url)}>Copy</button>
                <a className="btn-primary text-xs" href={url} target="_blank" rel="noreferrer">Preview</a>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
