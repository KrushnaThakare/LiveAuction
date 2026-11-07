import { TrendingUp } from 'lucide-react';
import { resolveUrl } from '../../../utils/resolveUrl';
import { driveImg } from '../../../utils/driveImage';
import { playerIdLabel } from '../../../utils/playerSearch';
import { getRoleShortLabel } from '../../../utils/formatters';
import { parseMainOverlayFields } from '../../../utils/overlayMainFields';
import BidAmountDisplay from '../BidAmountDisplay';
import styles from '../../../pages/OverlayBroadcast.module.css';

const money = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

export default function OverlayMainHplLayout({
  auction,
  player,
  team,
  config,
  connected,
  bidPopToken,
  squadPickLabel,
  isSold,
  isUnsold,
  showVerdict,
  increment,
}) {
  const fields = parseMainOverlayFields(config?.overlayMainShowFields);
  const logoSrc = config?.logoUrl ? resolveUrl(config.logoUrl) : null;
  const imgUrl = player ? driveImg(player.imageUrl) || resolveUrl(player.imageUrl) : null;
  const status = auction?.status || 'IDLE';

  return (
    <>
      {logoSrc && (
        <img src={logoSrc} alt="" className={styles.hplCornerLogo} />
      )}
      <section className={`${styles.hplDock} ${isSold ? styles.soldResult : ''} ${isUnsold ? styles.unsoldResult : ''}`}>
        <div className={styles.hplPhotoSlot}>
          {imgUrl ? (
            <img src={imgUrl} alt="" className={styles.hplPhoto} />
          ) : (
            <div className={styles.hplPhotoFallback}>{player?.name?.[0] || '?'}</div>
          )}
        </div>
        <div className={styles.hplBaseBlock}>
          {fields.basePrice && (
            <>
              <span className={styles.hplKicker}>Base price</span>
              <strong className={styles.hplBaseAmount}>{money(player?.basePrice)}</strong>
            </>
          )}
          {fields.playerId && player?.id != null && (
            <span className={styles.hplPlayerId}>{playerIdLabel(player)}</span>
          )}
        </div>
        <div className={styles.hplCenterBlock}>
          <h1 className={styles.hplPlayerName}>{player?.name || 'Waiting for player'}</h1>
          <div className={styles.hplTags}>
            {fields.role && player?.role && (
              <span className={styles.hplTag}>{getRoleShortLabel(player.role, config?.playerRoles)}</span>
            )}
            {config?.auctionDisplayName && (
              <span className={styles.hplTag}>{config.auctionDisplayName}</span>
            )}
          </div>
        </div>
        <div className={styles.hplBidBlock}>
          {!showVerdict && fields.currentBid && (
            <>
              <span className={styles.hplBidKicker}>Current bid</span>
              <BidAmountDisplay
                className={styles.hplBidAmount}
                amount={auction?.currentBid}
                formatAmount={money}
                popToken={bidPopToken}
              />
            </>
          )}
          {fields.teamBlock && !isSold && auction?.highestBidderTeamName && (
            <span className={styles.hplTeamLine}>{auction.highestBidderTeamName}</span>
          )}
          {fields.bidIncrement && !showVerdict && (
            <span className={styles.hplIncrement}><TrendingUp size={14} /> +{money(increment)}</span>
          )}
          <span className={styles.hplSync}>{connected ? 'Live' : 'Syncing'} · {status}</span>
        </div>
      </section>
    </>
  );
}
