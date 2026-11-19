package com.cricketauction.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class AuctionConstraintsResponse {
    private boolean quotasEnabled;
    private String playerCategory;
    private List<TeamBidConstraintDto> teams;
}