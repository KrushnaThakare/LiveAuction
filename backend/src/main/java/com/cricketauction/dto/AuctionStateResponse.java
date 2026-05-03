package com.cricketauction.dto;

import com.cricketauction.entity.AuctionSession;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AuctionStateResponse {
    private Long sessionId;
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
}
