package com.cricketauction.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class TournamentResponse {
    private Long id;
    private String name;
    private String description;
    private int totalPlayers;
    private int totalTeams;
    private int soldPlayers;
    private int unsoldPlayers;
    private LocalDateTime createdAt;
    private String bannerUrl;
    private Boolean registrationEnabled;
    private String registrationMessage;
    private String registrationRedirectLink;
}
