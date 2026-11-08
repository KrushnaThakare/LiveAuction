import OverlayMainHplLayout from '../mainLayouts/OverlayMainHplLayout';
import LowerThirdModern3D from './LowerThirdModern3D';
import LowerThirdCleanPremium from './LowerThirdCleanPremium';
import LowerThirdDynamicElectric from './LowerThirdDynamicElectric';

const PREMIUM = new Set(['modern-3d-sports', 'clean-premium-tv', 'dynamic-electric']);

export function isLowerThirdLayout(layout) {
  return PREMIUM.has(layout)
    || layout === 'hpl-lower-third'
    || layout === 'compact-strip'
    || layout === 'ipl-broadcast';
}

export default function OverlayMainLowerThird({
  layout,
  auction,
  player,
  team,
  config,
  connected,
  bidPopToken,
  squadPickLabel,
  isSold,
  isUnsold,
  showVerdict,
  increment,
  sessionId,
}) {
  if (layout === 'modern-3d-sports') {
    return (
      <LowerThirdModern3D
        auction={auction}
        player={player}
        team={team}
        config={config}
        bidPopToken={bidPopToken}
        isSold={isSold}
        isUnsold={isUnsold}
        sessionId={sessionId}
      />
    );
  }
  if (layout === 'clean-premium-tv') {
    return (
      <LowerThirdCleanPremium
        auction={auction}
        player={player}
        team={team}
        config={config}
        bidPopToken={bidPopToken}
        isSold={isSold}
        isUnsold={isUnsold}
        sessionId={sessionId}
      />
    );
  }
  if (layout === 'dynamic-electric') {
    return (
      <LowerThirdDynamicElectric
        auction={auction}
        player={player}
        team={team}
        config={config}
        bidPopToken={bidPopToken}
        isSold={isSold}
        isUnsold={isUnsold}
        sessionId={sessionId}
      />
    );
  }

  const variant = layout === 'ipl-broadcast' ? 'ipl' : 'hpl';
  return (
    <OverlayMainHplLayout
      auction={auction}
      player={player}
      team={team}
      config={config}
      connected={connected}
      bidPopToken={bidPopToken}
      squadPickLabel={squadPickLabel}
      isSold={isSold}
      isUnsold={isUnsold}
      showVerdict={showVerdict}
      increment={increment}
      variant={variant}
    />
  );
}
