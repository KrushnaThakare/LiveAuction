import BidAmountDisplay from '../BidAmountDisplay';
import {
  auctionStatusLabel,
  moneyInr,
  pickMainFields,
  playerRoleLabel,
  resolvePlayerPhoto,
  resolveTeamLogoSrc,
} from './lowerThirdUtils';
import s from './LowerThirdDynamicElectric.module.css';

export default function LowerThirdDynamicElectric({
  auction,
  player,
  team,
  config,
  bidPopToken,
  isSold,
  isUnsold,
  sessionId,
}) {
  const fields = pickMainFields(config);
  const photo = resolvePlayerPhoto(player);
  const logo = resolveTeamLogoSrc(team);
  const status = auctionStatusLabel(auction?.status, isSold, isUnsold);
  const teamKey = auction?.highestBidderTeamId || auction?.highestBidderTeamName || 'none';

  return (
    <section
      className={`${s.root} ${isSold ? s.sold : ''} ${isUnsold ? s.unsold : ''}`}
      key={sessionId}
      aria-live="polite"
    >
      <div className={s.photoCol}>
        <div className={s.photoFrame}>
          <div className={s.photoInner}>
            {photo ? <img src={photo} alt="" /> : (
              <div className={s.photoFallback}>{player?.name?.[0] || '?'}</div>
            )}
          </div>
        </div>
      </div>

      <div className={s.identity}>
        <h2 className={s.name}>{player?.name || 'Waiting for player'}</h2>
        {fields.role !== false && (
          <span className={s.role}>{playerRoleLabel(player, config)}</span>
        )}
        <span className={s.status}>{status}</span>
      </div>

      {fields.basePrice !== false && (
        <div className={s.baseBlock}>
          <span className={s.kicker}>Base price</span>
          <strong className={s.amount}>{moneyInr(player?.basePrice)}</strong>
        </div>
      )}

      {fields.currentBid !== false && (
        <div className={s.bidBlock}>
          <span className={s.kicker}>{isSold ? 'Sold for' : 'Current bid'}</span>
          {isUnsold ? (
            <strong className={s.bidAmount}>UNSOLD</strong>
          ) : (
            <BidAmountDisplay
              className={s.bidAmount}
              amount={auction?.currentBid}
              formatAmount={moneyInr}
              popToken={bidPopToken}
            />
          )}
        </div>
      )}

      {fields.teamBlock !== false && (
        <div className={s.teamBlock} key={teamKey}>
          {logo ? (
            <img className={s.teamLogo} src={logo} alt="" />
          ) : (
            <div className={s.teamLogoFb}>{(team?.name || 'T')[0]}</div>
          )}
          <div className={s.teamName}>
            {auction?.highestBidderTeamName || team?.name || 'Awaiting bidder'}
          </div>
        </div>
      )}
    </section>
  );
}
