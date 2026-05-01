/**
 * Resolves the correct display URL for a player image.
 *
 * Backend stores Drive images as thumbnail URLs:
 *   https://drive.google.com/thumbnail?id={id}&sz=w400-h400
 *
 * These are loaded sequentially (one at a time, 350ms gap) via SequentialImage
 * to avoid Google's rate-limiting (429) that occurs when many load at once.
 */

const API_ORIGIN = (() => {
  const base = (import.meta.env.VITE_API_URL || 'http://localhost:8080/api').replace(/\/+$/, '');
  return base.endsWith('/api') ? base.slice(0, -4) : base;
})();

export function driveImg(url) {
  if (!url) return null;

  // Locally stored image (/api/images/...) — make absolute
  if (url.startsWith('/api/')) return `${API_ORIGIN}${url}`;

  // Already absolute local URL
  if (url.startsWith('http://localhost') || url.startsWith('http://127.')) return url;

  // Already a thumbnail URL — return as-is
  if (url.includes('thumbnail?id=')) return url;

  // Any other Drive URL — convert to thumbnail
  if (url.includes('drive.google.com') || url.includes('lh3.googleusercontent.com')) {
    const id = extractDriveId(url);
    if (id) return `https://drive.google.com/thumbnail?id=${id}&sz=w400-h400`;
  }

  return url;
}

function extractDriveId(url) {
  try {
    if (url.includes('/d/')) {
      const part = url.split('/d/')[1];
      return part.split('/')[0].split('?')[0].split('=')[0];
    }
    if (url.includes('id=')) {
      let id = url.split('id=')[1];
      if (id.includes('&')) id = id.split('&')[0];
      if (id.includes('?')) id = id.split('?')[0];
      return id.trim();
    }
    if (url.includes('lh3.googleusercontent.com/d/')) {
      return url.split('lh3.googleusercontent.com/d/')[1].split('=')[0];
    }
  } catch (_) {}
  return null;
}
