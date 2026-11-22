import { useLayoutEffect, useRef, useState } from 'react';

const MIN_SCALE = 0.38;

/**
 * Renders bid amount anchored to the right; scales down as digits grow so lakhs stay on screen.
 */
export default function BidAmountDisplay({
  amount,
  formatAmount,
  className = '',
  popToken = 0,
  style,
  align = 'right',
}) {
  const text = formatAmount(amount);
  const outerRef = useRef(null);
  const measureRef = useRef(null);
  const [fitScale, setFitScale] = useState(1);

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const measure = measureRef.current;
    if (!outer || !measure) return;

    const fit = () => {
      measure.style.transform = 'none';
      const avail = outer.clientWidth;
      const need = measure.scrollWidth;
      if (avail > 0 && need > avail) {
        setFitScale(Math.max(MIN_SCALE, avail / need));
      } else {
        setFitScale(1);
      }
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(outer);
    return () => ro.disconnect();
  }, [text, popToken]);

  const origin = align === 'center' ? 'center center' : 'right center';
  const justify = align === 'center' ? 'center' : 'flex-end';

  return (
    <div
      ref={outerRef}
      className={className}
      style={{
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        overflow: 'hidden',
        display: 'flex',
        justifyContent: justify,
        ...style,
      }}
    >
      <span
        ref={measureRef}
        style={{
          display: 'inline-block',
          transform: fitScale < 1 ? `scale(${fitScale})` : undefined,
          transformOrigin: origin,
          whiteSpace: 'nowrap',
          maxWidth: fitScale < 1 ? 'none' : '100%',
        }}
      >
        <span key={popToken} className={popToken > 0 ? 'overlay-bid-pop' : undefined}>
          {text}
        </span>
      </span>
    </div>
  );
}