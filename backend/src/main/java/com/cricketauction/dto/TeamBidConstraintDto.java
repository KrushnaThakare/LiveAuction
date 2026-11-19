package com.cricketauction.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TeamBidConstraintDto {
    private Long teamId;
    private boolean canBid;
    private String reason;
    private Double maxBid;
}