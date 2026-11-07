import { resolveUrl } from './resolveUrl';

/** IPL / sportscast-style presets for Audience + Main overlay. */
export function overlayFontFamily(fontKey) {
  switch (String(fontKey || 'sport').toLowerCase()) {
    case 'broadcast':
      return '"Oswald", "Arial Narrow", sans-serif';
    case 'tech':
      return '"Orbitron", "Rajdhani", ui-monospace, monospace';
    default:
      return 'Inter, Rajdhani, "Arial Black", system-ui, sans-serif';
  }
}

export function overlayDisplayStyle(config, options = {}) {
  const { includeBackground = false } = options;
  const style = {
    fontFamily: overlayFontFamily(config?.overlayDisplayFont),
  };
  if (includeBackground && config?.overlayAudienceBackgroundUrl) {
    const url = resolveUrl(config.overlayAudienceBackgroundUrl);
    if (url) {
      style.backgroundImage = `url("${url}")`;
      style.backgroundSize = 'cover';
      style.backgroundPosition = 'center';
      style.backgroundRepeat = 'no-repeat';
    }
  }
  return style;
}

/** Scale inside a 100vw×100vh clip so OBS/YouTube does not scroll off-screen. */
export function mainOverlayViewportStyle(config) {
  return {
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    fontFamily: overlayFontFamily(config?.overlayDisplayFont),
  };
}

export function mainOverlayScaledStyle(config) {
  const scale = Math.max(0.8, Math.min(1, Number(config?.overlayMainScalePercent ?? 100) / 100));
  return {
    transform: `scale(${scale})`,
    transformOrigin: 'top center',
    width: '100%',
    maxWidth: 1920,
    minHeight: scale < 1 ? `${(100 / scale).toFixed(2)}vh` : '100vh',
  };
}
