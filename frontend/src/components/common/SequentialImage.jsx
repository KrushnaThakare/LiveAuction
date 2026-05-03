import { useState, useEffect, useRef } from 'react';

/**
 * Renders a Google Drive thumbnail image with sequential loading.
 *
 * Problem 1: Loading 40+ Drive thumbnail URLs simultaneously triggers Google's
 *   rate-limit (429), causing all images to fail.
 * Problem 2: Switching tabs causes components to unmount/remount, re-enqueueing
 *   already-loaded images and triggering another queue run.
 *
 * Solution:
 *   - Global sequential queue (one image every 350ms) prevents rate-limiting.
 *   - Module-level URL cache (loadedCache Set): once a URL has been displayed
 *     successfully, subsequent mounts show it instantly without re-queuing.
 */

// ── URL cache: URLs that have already loaded successfully ─────────────────────
const loadedCache = new Set();

// ── Global sequential load queue ──────────────────────────────────────────────
const queue = [];
let processing = false;

function enqueue(callback) {
  queue.push(callback);
  if (!processing) processNext();
}

function processNext() {
  if (queue.length === 0) { processing = false; return; }
  processing = true;
  const next = queue.shift();
  next();
  setTimeout(processNext, 350);
}
// ─────────────────────────────────────────────────────────────────────────────

function isDriveUrl(src) {
  return src && (
    src.includes('drive.google.com') ||
    src.includes('lh3.googleusercontent.com')
  );
}

export default function SequentialImage({ src, alt, className, style, fallback }) {
  const [displaySrc, setDisplaySrc] = useState(() => {
    // If already cached, show immediately
    if (src && !isDriveUrl(src)) return src;
    if (src && loadedCache.has(src)) return src;
    return null;
  });
  const [failed, setFailed]   = useState(false);
  const mountedRef            = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    if (!src) { setDisplaySrc(null); setFailed(false); return; }

    // Non-Drive: show instantly
    if (!isDriveUrl(src)) {
      setDisplaySrc(src);
      return;
    }

    // Already cached: show instantly, skip the queue
    if (loadedCache.has(src)) {
      setDisplaySrc(src);
      return;
    }

    // First time seeing this Drive URL: go through queue
    setDisplaySrc(null);
    setFailed(false);

    enqueue(() => {
      if (mountedRef.current) setDisplaySrc(src);
    });

    return () => { mountedRef.current = false; };
  }, [src]);

  const handleLoad = () => {
    // Mark URL as successfully loaded so future mounts skip the queue
    if (src) loadedCache.add(src);
  };

  if (!src || failed) return fallback || null;

  if (!displaySrc) return (
    <div className={className} style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        width: '100%', height: '100%', borderRadius: 'inherit',
        background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.09) 50%, rgba(255,255,255,0.04) 100%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s ease-in-out infinite',
      }} />
    </div>
  );

  return (
    <img
      src={displaySrc}
      alt={alt}
      className={className}
      style={style}
      onLoad={handleLoad}
      onError={() => { if (mountedRef.current) setFailed(true); }}
    />
  );
}
