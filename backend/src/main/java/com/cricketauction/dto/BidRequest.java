package com.cricketauction.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class BidRequest {
    @NotNull(message = "Team ID is required")
    private Long teamId;

    /**
     * Optional manual bid amount. If null the engine recalculates and applies
     * the active tournament bid slab from the current bid amount.
     */
    private Double customBidAmount;
}
