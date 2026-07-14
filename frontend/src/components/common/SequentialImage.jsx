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
  window.setTimeout(next, 120);
  setTimeout(processNext, 350);
}
// ─────────────────────────────────────────────────────────────────────────────

function isDriveUrl(src) {
  return src && (
    src.includes('drive.google.com') ||
    src.includes('lh3.googleusercontent.com')
  );
}

function preloadImage(src, maxAttempts = 3) {
  return new Promise((resolve, reject) => {
    let attempt = 0;

    const tryLoad = () => {
      attempt += 1;
      const img = new Image();
      img.onload = resolve;
      img.onerror = () => {
        if (attempt >= maxAttempts) {
          reject(new Error('Image failed to load'));
          return;
        }
        window.setTimeout(tryLoad, 500 * attempt);
      };
      img.src = src;
    };

    tryLoad();
  });
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
  const loadTokenRef          = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    const token = loadTokenRef.current + 1;
    loadTokenRef.current = token;
    const isCurrent = () => mountedRef.current && loadTokenRef.current === token;
    const schedule = (callback) => {
      window.setTimeout(() => {
        if (isCurrent()) callback();
      }, 0);
    };

    if (!src) {
      schedule(() => { setDisplaySrc(null); setFailed(false); });
      return () => {
        mountedRef.current = false;
        loadTokenRef.current += 1;
      };
    }

    // Non-Drive: show instantly
    if (!isDriveUrl(src)) {
      schedule(() => { setDisplaySrc(src); setFailed(false); });
      return () => {
        mountedRef.current = false;
        loadTokenRef.current += 1;
      };
    }

    // Already cached: show instantly, skip the queue
    if (loadedCache.has(src)) {
      schedule(() => { setDisplaySrc(src); setFailed(false); });
      return () => {
        mountedRef.current = false;
        loadTokenRef.current += 1;
      };
    }

    // First time seeing this Drive URL: go through queue
    schedule(() => { setDisplaySrc(null); setFailed(false); });

    enqueue(() => {
      if (!isCurrent()) return;
      preloadImage(src)
        .then(() => {
          if (!isCurrent()) return;
          loadedCache.add(src);
          setDisplaySrc(src);
          setFailed(false);
        })
        .catch(() => {
          if (isCurrent()) setFailed(true);
        });
    });

    return () => {
      mountedRef.current = false;
      loadTokenRef.current += 1;
    };
  }, [src]);

  const handleLoad = () => {
    // Mark URL as successfully loaded so future mounts skip the queue
    if (displaySrc) loadedCache.add(displaySrc);
  };

  const handleError = () => {
    if (!mountedRef.current) return;
    setFailed(true);
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
      onError={handleError}
    />
  );
}
