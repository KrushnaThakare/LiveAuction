import { useLayoutEffect, useRef, useState } from 'react';
import { bidDigitTierScale } from '../../utils/bidAmountScale';

const OVERFLOW_FLOOR = 0.72;

/**
 * Audience / overlay bid: only the amount shrinks in small steps per digit count;
 * optional tiny extra shrink if the panel is still too narrow.
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
  const digitScale = bidDigitTierScale(amount);
  const outerRef = useRef(null);
  const measureRef = useRef(null);
  const [overflowScale, setOverflowScale] = useState(1);

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const measure = measureRef.current;
    if (!outer || !measure) return;

    const fit = () => {
      measure.style.transform = 'none';
      const avail = outer.clientWidth;
      const need = measure.scrollWidth;
      if (avail > 0 && need > avail) {
        const ratio = avail / need;
        setOverflowScale(Math.max(OVERFLOW_FLOOR / digitScale, Math.min(1, ratio)));
      } else {
        setOverflowScale(1);
      }
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(outer);
    return () => ro.disconnect();
  }, [text, popToken, digitScale]);

  const origin = align === 'center' ? 'center center' : 'right center';
  const justify = align === 'center' ? 'center' : 'flex-end';
  const combined = digitScale * overflowScale;

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
          fontSize: `${digitScale}em`,
          transform: overflowScale < 1 ? `scale(${overflowScale})` : undefined,
          transformOrigin: origin,
          whiteSpace: 'nowrap',
        }}
        title={combined < 0.99 ? text : undefined}
      >
        <span key={popToken} className={popToken > 0 ? 'overlay-bid-pop' : undefined}>
          {text}
        </span>
      </span>
    </div>
  );
}