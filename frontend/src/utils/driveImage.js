/**
 * Converts any Google Drive URL to a direct image URL.
 *
 * drive.google.com/open?id=...  → NOT an image (redirect to viewer) → convert
 * drive.google.com/file/d/...   → NOT an image (viewer page)        → convert
 * drive.google.com/uc?export=view&id=... → DIRECT image URL ✓
 *
 * The uc?export=view URL works as an <img src> in the browser when the user
 * is signed into Google in the same browser (no extra setup needed).
 */

const API_ORIGIN = (() => {
  const base = (import.meta.env.VITE_API_URL || 'http://localhost:8080/api').replace(/\/+$/, '');
  return base.endsWith('/api') ? base.slice(0, -4) : base;
})();

export function driveImg(url) {
  if (!url) return null;

  // Locally stored image — make absolute
  if (url.startsWith('/api/')) return `${API_ORIGIN}${url}`;

  // Already absolute local URL
  if (url.startsWith('http://localhost') || url.startsWith('http://127.')) return url;

  // Already the correct direct image URL — return as-is
  if (url.includes('uc?export=view')) return url;
  if (url.includes('uc?export=download')) return url;

  // Any other Drive URL — extract the file ID and build the direct URL
  if (url.includes('drive.google.com') || url.includes('lh3.googleusercontent.com')) {
    const id = extractDriveId(url);
    if (id) return `https://drive.google.com/uc?export=view&id=${id}`;
  }

  return url;
}

function extractDriveId(url) {
  try {
    // /file/d/{id}/view  or  /d/{id}
    if (url.includes('/d/')) {
      const part = url.split('/d/')[1];
      return part.split('/')[0].split('?')[0].split('=')[0];
    }
    // ?id={id}  or  &id={id}  or  open?id={id}
    if (url.includes('id=')) {
      let id = url.split('id=')[1];
      if (id.includes('&')) id = id.split('&')[0];
      if (id.includes('?')) id = id.split('?')[0];
      return id.trim();
    }
    // lh3.googleusercontent.com/d/{id}=w...
    if (url.includes('lh3.googleusercontent.com/d/')) {
      return url.split('lh3.googleusercontent.com/d/')[1].split('=')[0];
    }
  } catch (_) {}
  return null;
}
