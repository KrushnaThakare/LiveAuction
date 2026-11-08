import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTournament } from '../contexts/TournamentContext';
import { broadcastApi } from '../api/broadcast';
import { tournamentApi } from '../api/tournaments';
import { resolveUrl } from '../utils/resolveUrl';
import toast from 'react-hot-toast';
import {
  MAIN_OVERLAY_LAYOUTS,
  parseMainOverlayFields,
  serializeMainOverlayFields,
} from '../utils/overlayMainFields';
import LowerThirdStudioSection from '../components/overlay/lowerThird/LowerThirdStudioSection';
import { LOWER_THIRD_PREMIUM_LAYOUTS } from '../components/overlay/lowerThird/lowerThirdUtils';
import PlayerIntroStudioSection from '../components/overlay/playerIntro/PlayerIntroStudioSection';
import { parseIntroStudioConfig, serializeIntroStudioConfig } from '../utils/overlayIntroStudio';

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

export default function DisplayStudioPage() {
  const { activeTournament } = useTournament();
  const tid = activeTournament?.id;
  const [settings, setSettings] = useState(null);
  const [mainFields, setMainFields] = useState(parseMainOverlayFields());
  const [introStudio, setIntroStudio] = useState(() => parseIntroStudioConfig());
  const audienceBgInputRef = useRef(null);
  const logoInputRef = useRef(null);
  const base = window.location.origin;
  const tokenQ = settings?.tokenEnabled && settings?.overlaySecretToken
    ? `&token=${encodeURIComponent(settings.overlaySecretToken)}` : '';

  useEffect(() => {
    if (!tid) return;
    broadcastApi.getSettings(tid).then((r) => {
      const loaded = r.data.data || {};
      setSettings({
        ...loaded,
        overlayMainScalePercent: loaded.overlayMainScalePercent ?? 94,
        overlayDisplayFont: loaded.overlayDisplayFont || 'sport',
        overlayMainLayout: loaded.overlayMainLayout || 'classic',
        overlayShowTeamMaxBid: loaded.overlayShowTeamMaxBid !== false,
        logoUrl: loaded.logoUrl || activeTournament?.logoUrl || '',
      });
      setMainFields(parseMainOverlayFields(loaded.overlayMainShowFields));
      setIntroStudio(parseIntroStudioConfig(loaded.overlayMainIntroConfig));
    });
  }, [tid, activeTournament?.logoUrl]);

  const save = async () => {
    if (!tid || !settings) return;
    const introPayload = serializeIntroStudioConfig(introStudio);
    await broadcastApi.updateSettings(tid, {
      ...settings,
      overlayMainShowFields: serializeMainOverlayFields(mainFields),
      overlayMainIntroConfig: introPayload,
      overlayMainPlayerIntroMs: (introStudio.durationSec || 5) * 1000,
    });
    toast.success('Display studio saved');
  };

  if (!tid) {
    return <p className="p-6 text-sm" style={{ color: 'var(--color-text-secondary)' }}>Select a tournament first.</p>;
  }

  if (!settings) {
    return <p className="p-6 text-sm" style={{ color: 'var(--color-text-secondary)' }}>Loading…</p>;
  }

  const setField = (key, value) => setMainFields((f) => ({ ...f, [key]: value }));

  return (
    <div className="max-w-5xl mx-auto p-4 pb-16 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black">Display Studio</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            Audience display + Main OBS overlay look &amp; feel (IPL / HPL-style controls).
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/broadcast" className="btn-secondary text-sm">← Broadcast control</Link>
          <button type="button" className="btn-primary" onClick={save}>Save studio</button>
        </div>
      </div>

      <section className="card p-4 space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>Branding</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold mb-2">Tournament logo (corner on overlays)</p>
            {settings.logoUrl && (
              <img src={resolveUrl(settings.logoUrl)} alt="" className="h-16 w-16 object-contain mb-2 rounded-lg" style={{ background: 'var(--color-surface-2)' }} />
            )}
            <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const res = await tournamentApi.uploadLogo(tid, f);
              setSettings((s) => ({ ...s, logoUrl: res.data.data }));
              toast.success('Logo uploaded');
              e.target.value = '';
            }} />
            <button type="button" className="btn-secondary text-xs" onClick={() => logoInputRef.current?.click()}>Upload logo</button>
          </div>
          <div>
            <p className="text-xs font-semibold mb-2">Audience background image</p>
            <input ref={audienceBgInputRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const res = await broadcastApi.uploadAudienceBackground(tid, f);
              setSettings((s) => ({ ...s, overlayAudienceBackgroundUrl: res.data.data }));
              toast.success('Background uploaded');
              e.target.value = '';
            }} />
            <button type="button" className="btn-secondary text-xs" onClick={() => audienceBgInputRef.current?.click()}>Upload background</button>
          </div>
        </div>
      </section>

      <PlayerIntroStudioSection
        tournamentId={tid}
        settings={settings}
        introStudio={introStudio}
        overlayToken={settings.overlaySecretToken}
        onEnabledChange={(enabled) => setSettings((s) => ({ ...s, overlayShowMainPlayerIntro: enabled }))}
        onIntroChange={(patch) => setIntroStudio((prev) => ({ ...prev, ...patch }))}
      />

      <LowerThirdStudioSection
        tournamentId={tid}
        settings={settings}
        mainFields={mainFields}
        overlayToken={settings.overlaySecretToken}
        onSelectLayout={(id) => setSettings((s) => ({ ...s, overlayMainLayout: id }))}
      />

      <section className="card p-4 space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>Legacy main overlay layouts</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {MAIN_OVERLAY_LAYOUTS.filter((layout) => !LOWER_THIRD_PREMIUM_LAYOUTS.some((p) => p.id === layout.id)).map((layout) => (
            <label key={layout.id} className={`rounded-xl p-3 border cursor-pointer ${settings.overlayMainLayout === layout.id ? 'border-blue-500' : ''}`}
              style={{ borderColor: settings.overlayMainLayout === layout.id ? 'var(--color-primary)' : 'var(--color-border)', background: 'var(--color-surface-2)' }}>
              <input
                type="radio"
                name="mainLayout"
                className="sr-only"
                checked={settings.overlayMainLayout === layout.id}
                onChange={() => setSettings((s) => ({ ...s, overlayMainLayout: layout.id }))}
              />
              <span className="font-semibold text-sm">{layout.label}</span>
              <span className="block text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>{layout.description}</span>
            </label>
          ))}
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-sm">
            Font style
            <select className="input mt-1" value={settings.overlayDisplayFont || 'sport'}
              onChange={(e) => setSettings((s) => ({ ...s, overlayDisplayFont: e.target.value }))}>
              <option value="sport">Sport</option>
              <option value="broadcast">Broadcast</option>
              <option value="tech">Tech / robotic bid digits</option>
            </select>
          </label>
          <label className="text-sm">
            Frame scale % (YouTube/OBS)
            <input className="input mt-1" type="number" min={80} max={100} value={settings.overlayMainScalePercent ?? 94}
              onChange={(e) => setSettings((s) => ({ ...s, overlayMainScalePercent: Number(e.target.value || 94) }))} />
          </label>
        </div>
      </section>

      <section className="card p-4 space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>Main overlay — show on screen</h2>
        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          Turn off fields you do not collect in Excel (avoids duplicates). Extra Excel columns still map via Main detail fields on Broadcast page.
        </p>
        <div className="grid sm:grid-cols-2 gap-1">
          <ToggleRow label="Base price" checked={!!mainFields.basePrice} onChange={(e) => setField('basePrice', e.target.checked)} />
          <ToggleRow label="Role" checked={!!mainFields.role} onChange={(e) => setField('role', e.target.checked)} />
          <ToggleRow label="Player ID" checked={!!mainFields.playerId} onChange={(e) => setField('playerId', e.target.checked)} />
          <ToggleRow label="Excel detail slots" checked={!!mainFields.detailSlots} onChange={(e) => setField('detailSlots', e.target.checked)} />
          <ToggleRow label="Team / bidder block" checked={!!mainFields.teamBlock} onChange={(e) => setField('teamBlock', e.target.checked)} />
          <ToggleRow label="Bid increment" checked={!!mainFields.bidIncrement} onChange={(e) => setField('bidIncrement', e.target.checked)} />
          <ToggleRow label="Current bid" checked={!!mainFields.currentBid} onChange={(e) => setField('currentBid', e.target.checked)} />
        </div>
      </section>

      <section className="card p-4 space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>Audience display</h2>
        <ToggleRow
          label="Team max-bid strip (live)"
          hint="Shows each team’s max bid for the current player at bottom of Audience screen"
          checked={settings.overlayShowTeamMaxBid !== false}
          onChange={(e) => setSettings((s) => ({ ...s, overlayShowTeamMaxBid: e.target.checked }))}
        />
      </section>

      <section className="card p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-secondary)' }}>Preview</h2>
        <div className="flex flex-wrap gap-2">
          <a className="btn-secondary text-xs" href={`${base}/overlay/main?tournamentId=${tid}${tokenQ}`} target="_blank" rel="noreferrer">Main overlay</a>
          <a className="btn-secondary text-xs" href={`${base}/auction-display?tournamentId=${tid}${tokenQ}`} target="_blank" rel="noreferrer">Audience display</a>
          <a className="btn-secondary text-xs" href={`${base}/overlay/team-squad-board?tournamentId=${tid}${tokenQ}`} target="_blank" rel="noreferrer">Team squad board</a>
        </div>
      </section>
    </div>
  );
}
