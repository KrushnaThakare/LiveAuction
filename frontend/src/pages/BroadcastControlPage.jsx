import { useEffect, useState } from 'react';
import { useTournament } from '../contexts/TournamentContext';
import { broadcastApi } from '../api/broadcast';
import toast from 'react-hot-toast';

export default function BroadcastControlPage() {
  const { activeTournament } = useTournament();
  const tid = activeTournament?.id;
  const [settings, setSettings] = useState({ overlayEnabled:true, overlayTheme:'classic', overlayShowTeamBudget:true, overlayShowTeamList:true, overlayShowTicker:true, tokenEnabled:false, overlaySecretToken:'' });

  useEffect(() => {
    if (!tid) return;
    broadcastApi.getSettings(tid).then(r => setSettings(s => ({ ...s, ...r.data.data, overlaySecretToken: r.data.data.overlaySecretToken || '' })));
  }, [tid]);

  const save = async () => {
    if (!tid) return;
    await broadcastApi.updateSettings(tid, settings);
    toast.success('Broadcast settings saved');
  };

  const base = window.location.origin;
  const tokenQ = settings.tokenEnabled && settings.overlaySecretToken ? `&token=${encodeURIComponent(settings.overlaySecretToken)}` : '';
  const links = [
    ['Main', `${base}/overlay/main?tournamentId=${tid}${tokenQ}`],
    ['Team Budget', `${base}/overlay/team-budget?tournamentId=${tid}${tokenQ}`],
    ['Team List', `${base}/overlay/team-list?tournamentId=${tid}${tokenQ}`],
    ['Ticker', `${base}/overlay/ticker?tournamentId=${tid}${tokenQ}`],
  ];

  return <div className='max-w-4xl mx-auto px-4 py-8'>
    <h1 className='text-2xl font-bold mb-4'>Broadcast Control</h1>
    {!tid ? <p>Select tournament first.</p> : <>
      <div className='card p-4 mb-4 space-y-2'>
        <label><input type='checkbox' checked={!!settings.overlayEnabled} onChange={e=>setSettings(s=>({...s,overlayEnabled:e.target.checked}))} /> Overlay enabled</label>
        <label><input type='checkbox' checked={!!settings.overlayShowTeamBudget} onChange={e=>setSettings(s=>({...s,overlayShowTeamBudget:e.target.checked}))} /> Show Team Budget</label>
        <label><input type='checkbox' checked={!!settings.overlayShowTeamList} onChange={e=>setSettings(s=>({...s,overlayShowTeamList:e.target.checked}))} /> Show Team List</label>
        <label><input type='checkbox' checked={!!settings.overlayShowTicker} onChange={e=>setSettings(s=>({...s,overlayShowTicker:e.target.checked}))} /> Show Ticker</label>
        <label><input type='checkbox' checked={!!settings.tokenEnabled} onChange={e=>setSettings(s=>({...s,tokenEnabled:e.target.checked}))} /> Enable token</label>
        {settings.tokenEnabled && <input className='input' value={settings.overlaySecretToken||''} onChange={e=>setSettings(s=>({...s,overlaySecretToken:e.target.value}))} placeholder='secret token'/>}
        <button className='btn-primary' onClick={save}>Save</button>
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
