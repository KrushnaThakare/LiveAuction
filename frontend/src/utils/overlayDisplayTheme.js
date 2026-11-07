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
  const { includeBackground = false, scalePercent } = options;
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
  if (scalePercent != null) {
    const scale = Math.max(0.8, Math.min(1, Number(scalePercent) / 100));
    style.transform = `scale(${scale})`;
    style.transformOrigin = 'top center';
    style.width = `${(100 / scale).toFixed(2)}%`;
    style.height = `${(100 / scale).toFixed(2)}%`;
  }
  return style;
}
