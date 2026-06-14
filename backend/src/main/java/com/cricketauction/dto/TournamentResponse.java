package com.cricketauction.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class TournamentResponse {
    private Long id;
    private String name;
    private String auctionDisplayName;
    private String sport;
    private List<PlayerRoleDto> playerRoles;
    private String description;
    private int totalPlayers;
    private int totalTeams;
    private int soldPlayers;
    private int unsoldPlayers;
    private LocalDateTime createdAt;
    private String logoUrl;
    private String bannerUrl;
    private Boolean registrationEnabled;
    private String registrationMessage;
    private String registrationRedirectLink;
}
