import { useEffect, useRef, useState } from 'react';

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

export default function AnimatedNumber({ value = 0, duration = 650, format = (v) => String(v) }) {
  const [display, setDisplay] = useState(Number(value) || 0);
  const fromRef = useRef(Number(value) || 0);
  const frameRef = useRef(null);

  useEffect(() => {
    const target = Number(value) || 0;
    const from = fromRef.current;
    if (from === target) return undefined;

    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const next = from + (target - from) * easeOutCubic(progress);
      setDisplay(next);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
        setDisplay(target);
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [value, duration]);

  return <>{format(display)}</>;
}
