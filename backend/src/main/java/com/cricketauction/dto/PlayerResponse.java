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
    private Player.PlayerStatus status;
    private Long tournamentId;
    private Long teamId;
    private String teamName;
}
