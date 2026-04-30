package com.cricketauction.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class BidRequest {
    @NotNull(message = "Team ID is required")
    private Long teamId;

    /**
     * Optional manual bid amount. If null the engine applies the standard
     * increment rule (+1000 or +2000 depending on threshold).
     */
    private Double customBidAmount;
}
