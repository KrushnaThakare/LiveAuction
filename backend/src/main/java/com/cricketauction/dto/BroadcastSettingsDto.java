package com.cricketauction.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class BroadcastSettingsDto {
    private Boolean overlayEnabled;
    private String overlayTheme;
    private Boolean overlayShowTeamBudget;
    private Boolean overlayShowTeamList;
    private Boolean overlayShowTicker;
    private Boolean publicViewShowTeams;
    private Boolean publicViewShowSold;
    private Boolean publicViewShowUnsold;
    private Boolean overlayShowPlayerStatsIntro;
    private Integer overlayPlayerStatsIntroMs;
    private Boolean overlayShowCinematicIntro;
    private Boolean overlayCinematicIntroLive;
    private Boolean overlayShowPlayerTransition;
    private Boolean overlayShowBidPop;
    private Boolean overlayShowSquadFormation;
    private Integer maxSquadSize;
    private Boolean tokenEnabled;
    private String overlaySecretToken;
    private Boolean whatsappAutoEnabled;
    private Boolean whatsappConfigured;
    private String tournamentName;
    private String auctionDisplayName;
    private String logoUrl;
    private String sport;
    private java.util.List<PlayerRoleDto> playerRoles;
    private java.util.List<String> overlayAudienceDetailFields;
    private java.util.List<String> overlayMainDetailFields;
    private Boolean overlayShowRecordBreak;
    private Integer overlayCountdownSeconds;
}
