package com.cricketauction.dto;

import com.cricketauction.entity.AuctionSession;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AuctionStateResponse {
    private Long sessionId;
    private Long bidRevision;
    private AuctionSession.AuctionStatus status;
    private PlayerResponse currentPlayer;
    private Double currentBid;
    private Long highestBidderTeamId;
    private String highestBidderTeamName;
    private Double nextBidAmount;
    private Long tournamentId;
    /** True if the last closed session can still be undone */
    private boolean undoable;
    private Long undoSessionId;
    /** Runtime intro toggle — when false, Audience Display skips cinematic reveal */
    private Boolean cinematicIntroLive;
    /** Tournament auto-WhatsApp flag (avoids extra lookup on sell) */
    private Boolean whatsappAutoEnabled;
    /** True when this SOLD amount exceeded the prior tournament record */
    private Boolean highestSoldRecord;
    /** Prior tournament highest sold amount before this sale */
    private Double previousHighestSoldBid;
    /** Current tournament highest sold amount */
    private Double tournamentHighestSoldBid;
    /** Audience countdown signal id (monotonic per tournament) */
    private Long audienceCountdownId;
    /** Audience countdown seconds (5, 10, or 15) */
    private Integer audienceCountdownSeconds;
}
