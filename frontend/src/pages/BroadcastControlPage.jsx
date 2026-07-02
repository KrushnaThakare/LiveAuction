import { useEffect, useRef, useState } from 'react';
import { useTournament } from '../contexts/TournamentContext';
import { broadcastApi } from '../api/broadcast';
import { bidRuleApi } from '../api/bidRules';
import toast from 'react-hot-toast';
import SquadSizeInput from '../components/common/SquadSizeInput';
import { clampSquadSize } from '../utils/squadFormation';

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
    whatsappAutoEnabled: false,
    whatsappConfigured: false,
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
  ];

  return <div className='max-w-4xl mx-auto px-4 py-8'>
    <h1 className='text-2xl font-bold mb-4'>Broadcast Control</h1>
    {!tid ? <p>Select tournament first.</p> : <>
      <div className='card p-4 mb-4 space-y-2'>
        <label><input type='checkbox' checked={settings.overlayEnabled !== false} onChange={e=>setSettings(s=>({...s,overlayEnabled:e.target.checked}))} /> Broadcaster mode enabled</label>
        <p className='text-xs' style={{ color: 'var(--color-text-secondary)' }}>
          Turn this off to stop the public home-viewer link (/view) and reduce WebSocket fan-out. Studio overlay screens (Main, Audience Display, etc.) keep working for your auction desk and OBS.
        </p>
        <label><input type='checkbox' checked={!!settings.overlayShowTeamBudget} onChange={e=>setSettings(s=>({...s,overlayShowTeamBudget:e.target.checked}))} /> Show Team Budget</label>
        <label><input type='checkbox' checked={!!settings.overlayShowTeamList} onChange={e=>setSettings(s=>({...s,overlayShowTeamList:e.target.checked}))} /> Show Team List</label>
        <label><input type='checkbox' checked={!!settings.overlayShowTicker} onChange={e=>setSettings(s=>({...s,overlayShowTicker:e.target.checked}))} /> Show Ticker</label>
        <label><input type='checkbox' checked={settings.overlayShowPlayerStatsIntro !== false} onChange={e=>setSettings(s=>({...s,overlayShowPlayerStatsIntro:e.target.checked}))} /> Show CricHeroes stats intro</label>
        {settings.overlayShowPlayerStatsIntro !== false && (
          <label className='block'>
            <span className='text-sm'>Stats intro duration (seconds)</span>
            <input
              className='input mt-1'
              type='number'
              min='1'
              max='15'
              step='0.5'
              value={(Number(settings.overlayPlayerStatsIntroMs || 5500) / 1000).toString()}
              onChange={e=>setSettings(s=>({...s,overlayPlayerStatsIntroMs: Math.round(Number(e.target.value || 5.5) * 1000)}))}
            />
          </label>
        )}
        <label><input type='checkbox' checked={!!settings.overlayShowCinematicIntro} onChange={e=>setSettings(s=>({...s,overlayShowCinematicIntro:e.target.checked}))} /> Enable cinematic player intro (Audience Display only)</label>
        <p className='text-xs' style={{ color: 'var(--color-text-secondary)' }}>
          Plays a premium reveal sequence on the Audience Display when the next player is picked. Does not affect the admin auction screen or other overlays.
        </p>
        <label><input type='checkbox' checked={settings.overlayShowPlayerTransition !== false} onChange={e=>setSettings(s=>({...s,overlayShowPlayerTransition:e.target.checked}))} /> Enable main overlay player transition</label>
        <p className='text-xs' style={{ color: 'var(--color-text-secondary)' }}>
          Premium slide transition on the Main overlay when the next player is selected.
        </p>
        <label><input type='checkbox' checked={settings.overlayShowBidPop !== false} onChange={e=>setSettings(s=>({...s,overlayShowBidPop:e.target.checked}))} /> Enable bid amount pop on overlays</label>
        <p className='text-xs' style={{ color: 'var(--color-text-secondary)' }}>
          Subtle scale pulse on current bid across overlay displays when the amount changes.
        </p>

        <div className='pt-3 mt-2 space-y-2' style={{ borderTop: '1px solid var(--color-border)' }}>
          <h3 className='text-sm font-bold'>Overlay player detail cards</h3>
          <p className='text-xs' style={{ color: 'var(--color-text-secondary)' }}>
            Pick up to two Excel extra column headers to show on Audience Display (left) and Main overlay (left stat cards).
            Leave blank to use automatic mapping (Category/Age/History). Role and Base Price always stay fixed.
          </p>
          <div className='grid sm:grid-cols-2 gap-3'>
            <div className='space-y-2'>
              <p className='text-xs font-semibold'>Audience Display</p>
              <input className='input' placeholder='Field 1 e.g. Category' value={settings.overlayAudienceDetailFields?.[0] || ''} onChange={e=>setAudienceField(0, e.target.value)} />
              <input className='input' placeholder='Field 2 e.g. Age' value={settings.overlayAudienceDetailFields?.[1] || ''} onChange={e=>setAudienceField(1, e.target.value)} />
            </div>
            <div className='space-y-2'>
              <p className='text-xs font-semibold'>Main overlay (OBS)</p>
              <input className='input' placeholder='Field 1 e.g. Age' value={settings.overlayMainDetailFields?.[0] || ''} onChange={e=>setMainField(0, e.target.value)} />
              <input className='input' placeholder='Field 2 e.g. Club' value={settings.overlayMainDetailFields?.[1] || ''} onChange={e=>setMainField(1, e.target.value)} />
            </div>
          </div>
        </div>

        <label><input type='checkbox' checked={!!settings.overlayShowSquadFormation} onChange={e=>setSettings(s=>({...s,overlayShowSquadFormation:e.target.checked}))} /> Audience Squad Formation Animation</label>
        <p className='text-xs' style={{ color: 'var(--color-text-secondary)' }}>
          Full-screen squad signing ceremony on the Audience Display after each SOLD gavel. Does not affect the admin auction screen or other overlays.
        </p>

        <div className='pt-3 mt-2 space-y-2' style={{ borderTop: '1px solid var(--color-border)' }}>
          <h3 className='text-sm font-bold'>Audience Display cinematics</h3>
          <label><input type='checkbox' checked={settings.overlayShowRecordBreak !== false} onChange={e=>setSettings(s=>({...s,overlayShowRecordBreak:e.target.checked}))} /> Record-break animation on new highest sold price</label>
          <p className='text-xs' style={{ color: 'var(--color-text-secondary)' }}>
            Plays a premium full-screen record animation before the SOLD gavel when a sale exceeds the tournament&apos;s previous highest price.
          </p>
          <label className='block'>
            <span className='text-sm'>Tournament countdown duration</span>
            <select
              className='input mt-1'
              value={settings.overlayCountdownSeconds || 5}
              onChange={e=>setSettings(s=>({...s,overlayCountdownSeconds: Number(e.target.value)}))}
            >
              <option value={5}>5 seconds</option>
              <option value={10}>10 seconds</option>
              <option value={15}>15 seconds</option>
            </select>
          </label>
          <p className='text-xs' style={{ color: 'var(--color-text-secondary)' }}>
            Used when the auction admin triggers Countdown from the live auction screen. Audience Display only.
          </p>
        </div>

        <label className='block'>
          <span className='text-sm'>Maximum Squad Size</span>
          <SquadSizeInput
            ref={squadSizeInputRef}
            value={settings.maxSquadSize}
            onChange={(maxSquadSize) => setSettings((s) => ({ ...s, maxSquadSize }))}
          />
        </label>
        <p className='text-xs' style={{ color: 'var(--color-text-secondary)' }}>
          Any whole number from 5 to 30 (e.g. 11, 12, 13, 15). Type the full number, then Save.
        </p>
        <label><input type='checkbox' checked={!!settings.whatsappAutoEnabled} onChange={e=>setSettings(s=>({...s,whatsappAutoEnabled:e.target.checked}))} /> Auto WhatsApp on sell</label>
        <p className='text-xs' style={{ color: 'var(--color-text-secondary)' }}>
          Sends a congratulations message when a player is sold. Turn off during live auction to reduce backend load.
          {settings.whatsappConfigured === false && (
            <span style={{ color: 'var(--color-warning)' }}> WhatsApp API is not configured on the server yet.</span>
          )}
        </p>
        <label><input type='checkbox' checked={!!settings.tokenEnabled} onChange={e=>setSettings(s=>({...s,tokenEnabled:e.target.checked}))} /> Enable token</label>
        {settings.tokenEnabled && <input className='input' value={settings.overlaySecretToken||''} onChange={e=>setSettings(s=>({...s,overlaySecretToken:e.target.value}))} placeholder='secret token'/>}

        <div className='pt-3 mt-2' style={{ borderTop: '1px solid var(--color-border)' }}>
          <h3 className='text-sm font-bold mb-1'>Public broadcast view (/view link)</h3>
          <p className='text-xs mb-2' style={{ color: 'var(--color-text-secondary)' }}>
            Home viewers use the share link. Disable tabs to avoid extra API calls when people browse Teams / Sold / Unsold. Live Auction tab is always shown.
          </p>
          <label><input type='checkbox' checked={settings.publicViewShowTeams !== false} onChange={e=>setSettings(s=>({...s,publicViewShowTeams:e.target.checked}))} /> Show Teams tab</label>
          <label><input type='checkbox' checked={settings.publicViewShowSold !== false} onChange={e=>setSettings(s=>({...s,publicViewShowSold:e.target.checked}))} /> Show Sold tab</label>
          <label><input type='checkbox' checked={settings.publicViewShowUnsold !== false} onChange={e=>setSettings(s=>({...s,publicViewShowUnsold:e.target.checked}))} /> Show Unsold tab</label>
          <p className='text-xs mt-1' style={{ color: 'var(--color-text-secondary)' }}>
            Share link: <code className='text-xs'>{tid ? `${base}/view/${tid}` : '—'}</code>
          </p>
        </div>

        <button className='btn-primary' onClick={save}>Save</button>
      </div>

      <div className='card p-4 mb-4 space-y-3'>
        <div>
          <h2 className='text-lg font-bold'>Bid Rule Engine</h2>
          <p className='text-xs' style={{ color: 'var(--color-text-secondary)' }}>Rules are tournament-specific. Keep ranges continuous: 0-10000, 10001-50000, etc.</p>
        </div>
        {bidRules.map((rule, idx) => <div key={idx} className='grid grid-cols-4 gap-2 items-center'>
          <input className='input' type='number' value={rule.minAmount ?? 0} onChange={e=>setRule(idx, 'minAmount', e.target.value)} placeholder='Min' />
          <input className='input' type='number' value={rule.maxAmount ?? 0} onChange={e=>setRule(idx, 'maxAmount', e.target.value)} placeholder='Max' />
          <input className='input' type='number' value={rule.incrementAmount ?? 0} onChange={e=>setRule(idx, 'incrementAmount', e.target.value)} placeholder='Increment' />
          <button className='btn-secondary' onClick={()=>removeRule(idx)}>Delete</button>
        </div>)}
        <button className='btn-secondary' onClick={addRule}>Add Rule</button>
      </div>
      {links.map(([name, url]) => <div key={name} className='card mb-3 p-3'>
        <p className='font-semibold'>{name}</p>
        <input readOnly className='input w-full' value={url} />
        <div className='mt-2 flex gap-2'>
          <button className='btn-secondary' onClick={() => navigator.clipboard.writeText(url)}>Copy</button>
          <a className='btn-primary' href={url} target='_blank' rel='noreferrer'>Preview</a>
        </div>
      </div>)}
    </>}
  </div>;
}
