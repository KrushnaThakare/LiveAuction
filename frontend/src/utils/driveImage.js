/**
 * Converts any Google Drive share URL to our backend proxy URL.
 *
 * Why a proxy?
 * - drive.google.com/uc?export=view returns 403 when the browser isn't
 *   logged into Google (auth context not present in the browser's fetch).
 * - The Spring Boot backend fetches the image server-to-server, which works
 *   for publicly-shared files, then streams the bytes to the browser.
 * - The browser only ever makes a request to http://localhost:8080/api/proxy/image
 *   so there's no auth/CORS/403 issue.
 *
 * For non-Drive URLs the original URL is returned unchanged.
 */

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8080/api')
  .replace(/\/+$/, '');

export function driveImg(url) {
  if (!url) return null;

  // Already a proxy URL (stored after upload) — make absolute if relative
  if (url.startsWith('/api/proxy/image')) {
    return `${API_BASE.replace('/api', '')}/api/proxy/image` + url.split('/api/proxy/image')[1];
  }

  // Already an absolute proxy URL from this server
  if (url.includes('/api/proxy/image')) return url;

  // Not a Drive URL — return as-is (external image, etc.)
  if (!url.includes('drive.google.com') && !url.includes('lh3.googleusercontent.com')) {
    return url;
  }

  // Extract file ID from any Drive URL variant
  let fileId = null;
  try {
    if (url.includes('/d/')) {
      fileId = url.split('/d/')[1].split('/')[0];
    } else if (url.includes('id=')) {
      fileId = url.split('id=')[1];
      if (fileId.includes('&')) fileId = fileId.split('&')[0];
    }
  } catch (_) { /* ignore */ }

  if (fileId && fileId.trim()) {
    return `${API_BASE}/proxy/image?id=${fileId.trim()}`;
  }

  return url;
}
