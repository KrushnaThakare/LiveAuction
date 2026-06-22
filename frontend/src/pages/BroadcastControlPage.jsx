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
    overlayShowCinematicIntro: false,
    overlayCinematicIntroLive: true,
    overlayShowPlayerTransition: true,
    overlayShowBidPop: true,
    overlayShowSquadFormation: false,
    maxSquadSize: 15,
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
      const data = r.data.data || {};
      setSettings((s) => ({
        ...s,
        ...data,
        maxSquadSize: clampSquadSize(data.maxSquadSize),
        overlaySecretToken: data.overlaySecretToken || '',
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

  const base = window.location.origin;
  const tokenQ = settings.tokenEnabled && settings.overlaySecretToken ? `&token=${encodeURIComponent(settings.overlaySecretToken)}` : '';
  const links = [
    ['Main', `${base}/overlay/main?tournamentId=${tid}${tokenQ}`],
    ['Team Budget', `${base}/overlay/team-budget?tournamentId=${tid}${tokenQ}`],
    ['Team Squad', `${base}/overlay/team-squad?tournamentId=${tid}${tokenQ}`],
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
        <label><input type='checkbox' checked={!!settings.overlayEnabled} onChange={e=>setSettings(s=>({...s,overlayEnabled:e.target.checked}))} /> Broadcaster mode enabled</label>
        <p className='text-xs' style={{ color: 'var(--color-text-secondary)' }}>
          Turn this off during performance incidents to stop broadcaster snapshots, WebSocket subscriptions, and public viewer updates. Auction operations continue normally.
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
        <label><input type='checkbox' checked={!!settings.overlayShowSquadFormation} onChange={e=>setSettings(s=>({...s,overlayShowSquadFormation:e.target.checked}))} /> Audience Squad Formation Animation</label>
        <p className='text-xs' style={{ color: 'var(--color-text-secondary)' }}>
          Full-screen squad signing ceremony on the Audience Display after each SOLD gavel. Does not affect the admin auction screen or other overlays.
        </p>
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
