package com.cricketauction.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class BidRequest {
    @NotNull(message = "Team ID is required")
    private Long teamId;

    /**
     * Optional manual bid amount. If null, team selection keeps the current
     * bid amount and only changes the bidder.
     */
    private Double customBidAmount;
}
