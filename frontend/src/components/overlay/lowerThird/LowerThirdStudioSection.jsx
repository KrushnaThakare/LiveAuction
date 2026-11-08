import { useMemo } from 'react';
import { useOverlayRealtime } from '../../../hooks/useOverlayRealtime';
import { serializeMainOverlayFields } from '../../../utils/overlayMainFields';
import LowerThirdStudioPreview from './LowerThirdStudioPreview';
import { LOWER_THIRD_PREMIUM_LAYOUTS } from './lowerThirdUtils';
import thumb from './LowerThirdStudioThumbs.module.css';

const THUMB_CLASS = {
  ltThumbGold: thumb.thumbGold,
  ltThumbClean: thumb.thumbClean,
  ltThumbElectric: thumb.thumbElectric,
};

export default function LowerThirdStudioSection({
  tournamentId,
  settings,
  mainFields,
  onSelectLayout,
  overlayToken,
}) {
  const token = settings?.tokenEnabled ? overlayToken : null;
  const { data, config } = useOverlayRealtime(tournamentId, token, { studioOverlay: true });

  const previewConfig = useMemo(() => ({
    ...config,
    ...settings,
    overlayMainShowFields: serializeMainOverlayFields(mainFields),
    playerRoles: config?.playerRoles,
  }), [config, settings, mainFields]);

  const auction = data?.auction;
  const player = auction?.currentPlayer;
  const teams = data?.teams || [];
  const team = teams.find(
    (t) => t.id === auction?.highestBidderTeamId || t.name === auction?.highestBidderTeamName,
  );
  const useLive = Boolean(player && (auction?.status === 'ACTIVE' || auction?.status === 'SOLD'));
  const selected = settings?.overlayMainLayout || 'modern-3d-sports';
  const previewLayout = LOWER_THIRD_PREMIUM_LAYOUTS.some((l) => l.id === selected)
    ? selected
    : 'modern-3d-sports';

  return (
    <section className="card p-4 space-y-4">
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
          Player Auction Lower Third Studio
        </h2>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          Premium broadcast lower thirds for OBS / YouTube. Selection saves with Display Studio and applies to the main overlay URL instantly.
        </p>
      </div>

      <div className={thumb.grid}>
        {LOWER_THIRD_PREMIUM_LAYOUTS.map((layout) => {
          const isSel = selected === layout.id;
          return (
            <button
              key={layout.id}
              type="button"
              className={`${thumb.card} ${isSel ? thumb.cardSelected : ''}`}
              onClick={() => onSelectLayout(layout.id)}
            >
              <div className={`${thumb.thumb} ${THUMB_CLASS[layout.thumbClass] || ''}`}>
                <div className={thumb.mockBar} aria-hidden />
                <div className={thumb.label}>{layout.label}</div>
                <div className={thumb.sub}>{layout.subtitle}</div>
              </div>
              <div className={thumb.body}>
                <p className={thumb.desc}>{layout.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div>
        <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-text-secondary)' }}>Live preview</p>
        <LowerThirdStudioPreview
          layout={previewLayout}
          auction={auction}
          player={player}
          team={team}
          config={previewConfig}
          useLive={useLive}
        />
      </div>
    </section>
  );
}
