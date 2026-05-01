import { useState, useEffect, useRef } from 'react';

/**
 * Renders a Google Drive thumbnail image with sequential loading.
 *
 * Problem: Loading 40+ Drive thumbnail URLs simultaneously triggers Google's
 * rate-limit (429), causing all images to fail.
 *
 * Solution: A global queue — images register themselves and load one at a time
 * with a 300ms gap between each. This keeps well under Google's rate limit.
 */

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
  // 350ms between each image load — well under Google's rate limit
  setTimeout(processNext, 350);
}
// ─────────────────────────────────────────────────────────────────────────────

export default function SequentialImage({ src, alt, className, style, fallback }) {
  const [displaySrc, setDisplaySrc] = useState(null);
  const [failed, setFailed] = useState(false);
  const imgRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    setDisplaySrc(null);
    setFailed(false);

    if (!src) return;

    // Non-Drive URLs (local /api/images/...) load immediately
    if (!src.includes('drive.google.com') && !src.includes('lh3.googleusercontent.com')) {
      setDisplaySrc(src);
      return;
    }

    // Drive URLs go through the sequential queue
    enqueue(() => {
      if (!mountedRef.current) return;
      setDisplaySrc(src);
    });

    return () => { mountedRef.current = false; };
  }, [src]);

  if (!src || failed) return fallback || null;
  if (!displaySrc) return (
    // Loading placeholder — keeps card height stable
    <div className={className} style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="animate-pulse rounded" style={{
        width: '100%', height: '100%',
        background: 'linear-gradient(90deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 100%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
      }} />
    </div>
  );

  return (
    <img
      ref={imgRef}
      src={displaySrc}
      alt={alt}
      className={className}
      style={style}
      onError={() => { if (mountedRef.current) setFailed(true); }}
    />
  );
}
