/**
 * Resolves a player image URL for display in the browser.
 *
 * Backend stores images as:
 *   /api/images/{filename}   → locally downloaded file (served by Spring Boot)
 *   /api/proxy/image?id=...  → legacy proxy URL (also served by Spring Boot)
 *   https://...              → external URL, pass through
 *
 * All /api/... paths are made absolute using the configured API base URL.
 */
const API_ORIGIN = (() => {
  const base = (import.meta.env.VITE_API_URL || 'http://localhost:8080/api').replace(/\/+$/, '');
  // Strip the /api suffix to get just the origin
  return base.endsWith('/api') ? base.slice(0, -4) : base.replace(/\/api$/, '');
})();

export function driveImg(url) {
  if (!url) return null;

  // Locally stored image — make absolute
  if (url.startsWith('/api/')) {
    return `${API_ORIGIN}${url}`;
  }

  // Already absolute — return as-is (covers http://localhost:8080/api/images/...)
  if (url.startsWith('http://') || url.startsWith('https://')) {
    // If it's a drive URL that wasn't converted, route through proxy
    if (url.includes('drive.google.com') || url.includes('lh3.googleusercontent.com')) {
      const id = extractDriveId(url);
      if (id) return `${API_ORIGIN}/api/proxy/image?id=${id}`;
    }
    return url;
  }

  return url;
}

function extractDriveId(url) {
  try {
    if (url.includes('/d/')) return url.split('/d/')[1].split('/')[0];
    if (url.includes('id=')) {
      let id = url.split('id=')[1];
      if (id.includes('&')) id = id.split('&')[0];
      return id;
    }
  } catch (_) {}
  return null;
}
