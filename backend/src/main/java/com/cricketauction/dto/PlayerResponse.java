package com.cricketauction.dto;

import com.cricketauction.entity.Player;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PlayerResponse {
    private Long id;
    private String name;
    private Player.PlayerRole role;
    private Double basePrice;
    private Double currentBid;
    private String imageUrl;
    private String cricheroesProfileUrl;
    private Long cricheroesPlayerId;
    private Integer statsMatches;
    private Integer statsRuns;
    private Double statsStrikeRate;
    private Integer statsWickets;
    private Double statsEconomy;
    private Double statsAverage;
    private String statsLastUpdatedAt;
    private Boolean retained;
    private Player.PlayerStatus status;
    private Long tournamentId;
    private Long teamId;
    private String teamName;
}
