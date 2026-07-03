package com.cricketauction.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TopSoldPlayerResponse {
    private int rank;
    private Long playerId;
    private String playerName;
    private String imageUrl;
    private Double soldPrice;
    private String teamName;
    private String teamLogoUrl;
}
