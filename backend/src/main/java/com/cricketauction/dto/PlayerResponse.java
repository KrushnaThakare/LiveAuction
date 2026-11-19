package com.cricketauction.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PlayerResponse {
    private Long id;
    private String name;
    private String role;
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
    private com.cricketauction.entity.Player.PlayerStatus status;
    private Long tournamentId;
    private Long teamId;
    private String teamName;
    /** Export-only optional fields from Excel (e.g. mobile, t-shirt size) */
    private java.util.Map<String, String> extraData;
    private com.cricketauction.entity.Player.WhatsAppNotifyStatus whatsappNotifyStatus;
    private String whatsappNotifyError;
    private String whatsappSentAt;
}
