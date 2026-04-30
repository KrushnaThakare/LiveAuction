/**
 * Returns the display URL for a player image.
 *
 * Images stored as Drive uc?export=view URLs are rendered directly by the
 * browser — the user's Google session cookies are sent automatically by
 * <img> tags, so the images load when the user is logged into Google.
 *
 * For locally-saved images (/api/images/...) we make the URL absolute.
 */
const API_ORIGIN = (() => {
  const base = (import.meta.env.VITE_API_URL || 'http://localhost:8080/api').replace(/\/+$/, '');
  return base.endsWith('/api') ? base.slice(0, -4) : base;
})();

export function driveImg(url) {
  if (!url) return null;

  // Locally stored image — make absolute
  if (url.startsWith('/api/')) {
    return `${API_ORIGIN}${url}`;
  }

  // Already absolute local URL
  if (url.startsWith('http://localhost') || url.startsWith('http://127.')) {
    return url;
  }

  // Drive URL — return as-is (browser renders with Google session cookies)
  return url;
}
