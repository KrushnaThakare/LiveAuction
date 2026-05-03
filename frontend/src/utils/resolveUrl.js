/**
 * Shared helper: resolves any URL that may be a relative /api/... path
 * to an absolute http://localhost:8080/api/... URL so <img src> works.
 */
const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:8080/api')
  .replace(/\/api\/?$/, '')
  .replace(/\/+$/, '');

export function resolveUrl(url) {
  if (!url) return null;
  if (url.startsWith('/api/')) return `${API_ORIGIN}${url}`;
  return url;
}
