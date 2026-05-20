import { useTournament } from '../contexts/TournamentContext';

export default function BroadcastControlPage() {
  const { activeTournament } = useTournament();
  const tid = activeTournament?.id;
  const base = window.location.origin;
  const links = [
    ['Main', `${base}/overlay/main?tournamentId=${tid}`],
    ['Team Budget', `${base}/overlay/team-budget?tournamentId=${tid}`],
    ['Team List', `${base}/overlay/team-list?tournamentId=${tid}`],
    ['Ticker', `${base}/overlay/ticker?tournamentId=${tid}`],
  ];
  return <div className='max-w-4xl mx-auto px-4 py-8'>
    <h1 className='text-2xl font-bold mb-4'>Broadcast Control</h1>
    {!tid ? <p>Select tournament first.</p> : links.map(([name, url]) => <div key={name} className='card mb-3 p-3'>
      <p className='font-semibold'>{name}</p>
      <input readOnly className='input w-full' value={url} />
      <div className='mt-2 flex gap-2'>
        <button className='btn-secondary' onClick={() => navigator.clipboard.writeText(url)}>Copy</button>
        <a className='btn-primary' href={url} target='_blank' rel='noreferrer'>Preview</a>
      </div>
    </div>)}
  </div>;
}
