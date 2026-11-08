import { useMemo, useState } from 'react';
import { useOverlayRealtime } from '../../../hooks/useOverlayRealtime';
import { useIntroStudioTestPulse } from '../../../hooks/useMainPlayerIntroOverlay';
import {
  INTRO_TEMPLATES,
  INTRO_DURATION_OPTIONS,
  INTRO_BACKGROUND_STYLES,
  INTRO_PLACEMENTS,
  INTRO_FIELD_CATALOG,
  INTRO_PREVIEW_PLAYER,
  introExitMs,
} from '../../../utils/overlayIntroStudio';
import PlayerIntroPresentation from './PlayerIntroPresentation';
import styles from './PlayerIntroStudioSection.module.css';

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 text-sm cursor-pointer">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span>{label}</span>
    </label>
  );
}

export default function PlayerIntroStudioSection({
  tournamentId,
  settings,
  introStudio,
  onIntroChange,
  onEnabledChange,
  overlayToken,
}) {
  const token = settings?.tokenEnabled ? overlayToken : null;
  const { data, config } = useOverlayRealtime(tournamentId, token, {
    studioOverlay: true,
    applyOverlayClass: false,
  });
  const auction = data?.auction;
  const livePlayer = auction?.currentPlayer;
  const testDuration = introStudio.durationSec * 1000;
  const testExit = introExitMs({ overlayMainIntroConfig: JSON.stringify(introStudio) });
  const {
    visible: testVisible, exiting: testExiting, replayKey, trigger: testTrigger,
  } = useIntroStudioTestPulse(testDuration, testExit);

  const previewPlayer = livePlayer || INTRO_PREVIEW_PLAYER;
  const previewConfig = useMemo(() => ({
    ...config,
    ...settings,
    overlayMainIntroConfig: JSON.stringify(introStudio),
    playerRoles: config?.playerRoles,
    overlayMainDetailFields: settings?.overlayMainDetailFields,
  }), [config, settings, introStudio]);

  const toggleField = (id) => {
    const set = new Set(introStudio.displayFields || []);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    onIntroChange({ displayFields: Array.from(set) });
  };

  return (
    <section className="card p-4 space-y-4">
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
          Player Introduction Studio
        </h2>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          Full-screen intro on each new player (main overlay). Replaces the lower third briefly, then restores automatically. Does not change auction state.
        </p>
      </div>

      <Toggle
        label="Enable player introduction on main overlay"
        checked={settings?.overlayShowMainPlayerIntro !== false}
        onChange={(e) => onEnabledChange(e.target.checked)}
      />

      <div className="grid sm:grid-cols-3 gap-3">
        {INTRO_TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`${styles.templateCard} ${introStudio.template === t.id ? styles.templateSelected : ''}`}
            onClick={() => onIntroChange({ template: t.id })}
          >
            <span className={styles.templateLabel}>{t.label}</span>
            <span className={styles.templateDesc}>{t.description}</span>
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <label className="text-sm">
          Duration (seconds)
          <select
            className="input mt-1"
            value={introStudio.durationSec}
            onChange={(e) => onIntroChange({ durationSec: Number(e.target.value) })}
          >
            {INTRO_DURATION_OPTIONS.map((n) => (
              <option key={n} value={n}>{n}s</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Background
          <select
            className="input mt-1"
            value={introStudio.backgroundStyle || 'none'}
            onChange={(e) => onIntroChange({ backgroundStyle: e.target.value })}
          >
            {INTRO_BACKGROUND_STYLES.map((b) => (
              <option key={b.id} value={b.id}>{b.label}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          On-screen position
          <select
            className="input mt-1"
            value={introStudio.placement || 'center'}
            onChange={(e) => onIntroChange({ placement: e.target.value })}
          >
            {INTRO_PLACEMENTS.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Animation speed
          <input
            className="input mt-1"
            type="range"
            min="0.6"
            max="1.6"
            step="0.1"
            value={introStudio.animationSpeed}
            onChange={(e) => onIntroChange({ animationSpeed: Number(e.target.value) })}
          />
        </label>
        <label className="text-sm">
          Intro scale %
          <input
            className="input mt-1"
            type="number"
            min="85"
            max="115"
            value={introStudio.introScalePercent}
            onChange={(e) => onIntroChange({ introScalePercent: Number(e.target.value || 100) })}
          />
        </label>
        <label className="text-sm">
          Photo scale %
          <input
            className="input mt-1"
            type="number"
            min="70"
            max="130"
            value={introStudio.photoScalePercent}
            onChange={(e) => onIntroChange({ photoScalePercent: Number(e.target.value || 100) })}
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-4">
        <Toggle label="Show photo" checked={introStudio.showPhoto !== false} onChange={(e) => onIntroChange({ showPhoto: e.target.checked })} />
        <Toggle label="Show role" checked={introStudio.showRole !== false} onChange={(e) => onIntroChange({ showRole: e.target.checked })} />
        <Toggle label="Show statistics / details" checked={introStudio.showStats !== false} onChange={(e) => onIntroChange({ showStats: e.target.checked })} />
      </div>

      <div>
        <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-text-secondary)' }}>Displayed player information</p>
        <div className="grid sm:grid-cols-2 gap-1">
          {INTRO_FIELD_CATALOG.map((f) => (
            <Toggle
              key={f.id}
              label={f.label}
              checked={(introStudio.displayFields || []).includes(f.id)}
              onChange={() => toggleField(f.id)}
            />
          ))}
        </div>
      </div>

      <div className={styles.previewWrap}>
        <div className={styles.previewStage}>
          <PlayerIntroPresentation
            player={previewPlayer}
            config={previewConfig}
            sessionKey={testVisible ? `test-${replayKey}` : 'studio-preview'}
            exiting={testExiting}
            studioOverride={introStudio}
            forceVisible
            embedded
          />
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          <button type="button" className="btn-secondary text-xs" onClick={testTrigger}>
            Test introduction (preview only)
          </button>
          {livePlayer ? (
            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Live player available for preview data.</span>
          ) : null}
        </div>
      </div>
    </section>
  );
}
