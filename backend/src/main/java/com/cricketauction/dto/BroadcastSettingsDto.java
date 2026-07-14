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
    private Boolean overlayShowPlayerIntro;
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
