package com.cricketauction.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PlayerRequest {
    @NotBlank(message = "Player name is required")
    private String name;

    @NotNull(message = "Role is required")
    private String role;

    @NotNull(message = "Base price is required")
    @Min(value = 1, message = "Base price must be positive")
    private Double basePrice;

    private String imageUrl;

    private String cricheroesProfileUrl;

    private Integer statsMatches;
    private Integer statsRuns;
    private Double statsStrikeRate;
    private Integer statsWickets;
    private Double statsEconomy;
    private Double statsAverage;

    private Boolean retained;

    private Long teamId;
}
