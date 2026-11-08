import OverlayMainLowerThird from './OverlayMainLowerThird';
import { LOWER_THIRD_PREVIEW_SAMPLE } from './lowerThirdUtils';
import styles from './LowerThirdStudioPreview.module.css';

/**
 * Scaled preview for Display Studio — uses live auction snapshot or sample data.
 */
export default function LowerThirdStudioPreview({ layout, auction, player, team, config, useLive }) {
  const sample = LOWER_THIRD_PREVIEW_SAMPLE;
  const a = useLive && auction ? auction : sample.auction;
  const p = useLive && player ? player : sample.player;
  const t = useLive && team ? team : sample.team;
  const status = a?.status || 'ACTIVE';
  const isSold = status === 'SOLD';
  const isUnsold = status === 'UNSOLD';
  const mergedConfig = {
    ...config,
    overlayMainShowFields: config?.overlayMainShowFields,
    playerRoles: config?.playerRoles,
  };

  return (
    <div className={styles.frame} aria-label="Lower third preview">
      <div className={styles.backdrop} aria-hidden />
      <div className={styles.stage}>
        <div className={styles.scaled}>
          <OverlayMainLowerThird
            layout={layout}
            auction={a}
            player={p}
            team={t}
            config={mergedConfig}
            connected
            bidPopToken={0}
            squadPickLabel={null}
            isSold={isSold}
            isUnsold={isUnsold}
            showVerdict={isSold || isUnsold}
            increment={500}
            sessionId={a?.sessionId || 'preview'}
          />
        </div>
      </div>
      <p className={styles.caption}>
        {useLive && player ? 'Live auction data' : 'Sample preview — start auction for live data'}
      </p>
    </div>
  );
}
