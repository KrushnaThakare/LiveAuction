package com.cricketauction.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.List;

@Data
public class TournamentRequest {
    @NotBlank(message = "Tournament name is required")
    private String name;
    private String auctionDisplayName;
    private String sport;
    private List<PlayerRoleDto> playerRoles;
    private String description;
    private String logoUrl;
    private Integer maxSquadSize;
}
