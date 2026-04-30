package com.cricketauction.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class TeamResponse {
    private Long id;
    private String name;
    private String logoUrl;
    private Double budget;
    private Double remainingBudget;
    private int playerCount;
    private List<PlayerResponse> players;
    private Long tournamentId;
}
