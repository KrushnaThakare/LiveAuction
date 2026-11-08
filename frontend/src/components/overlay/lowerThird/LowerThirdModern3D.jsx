import BidAmountDisplay from '../BidAmountDisplay';
import {
  auctionStatusLabel,
  moneyInr,
  pickMainFields,
  playerRoleLabel,
  resolvePlayerPhoto,
  resolveTeamLogoSrc,
} from './lowerThirdUtils';
import s from './LowerThirdModern3D.module.css';

export default function LowerThirdModern3D({
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
        <div className={s.roleRow}>
          {fields.role !== false && (
            <span className={s.rolePill}>{playerRoleLabel(player, config)}</span>
          )}
          <span className={s.statusPill}>{status}</span>
        </div>
      </div>

      {fields.basePrice !== false && (
        <div className={s.baseBlock}>
          <span className={s.baseKicker}>Base price</span>
          <strong className={s.baseAmount}>{moneyInr(player?.basePrice)}</strong>
        </div>
      )}

      {fields.currentBid !== false && (
        <div className={s.bidBlock}>
          <span className={s.bidKicker}>{isSold ? 'Sold for' : 'Current bid'}</span>
          {isUnsold ? (
            <strong className={s.soldStamp}>UNSOLD</strong>
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
            <div className={s.teamLogoFb}>{(team?.name || auction?.highestBidderTeamName || 'T')[0]}</div>
          )}
          <div>
            <div className={s.teamKicker}>{isSold ? 'Winning team' : 'Bidding team'}</div>
            <div className={s.teamName}>{auction?.highestBidderTeamName || team?.name || 'Awaiting bidder'}</div>
          </div>
        </div>
      )}
    </section>
  );
}
