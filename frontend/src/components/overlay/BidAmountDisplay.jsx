/** Renders bid amount with a CSS pop remount when popToken increments. */
export default function BidAmountDisplay({ amount, formatAmount, className = '', popToken = 0, style }) {
  return (
    <div className={className} style={style}>
      <span key={popToken} className={popToken > 0 ? 'overlay-bid-pop' : undefined}>
        {formatAmount(amount)}
      </span>
    </div>
  );
}
