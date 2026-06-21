package com.cricketauction.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "players", indexes = {
        @Index(name = "idx_players_tournament_status", columnList = "tournament_id,status"),
        @Index(name = "idx_players_tournament_team", columnList = "tournament_id,team_id")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Player {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, length = 50)
    private String role;

    @Column(name = "base_price", nullable = false)
    private Double basePrice;

    @Column(name = "current_bid")
    @Builder.Default
    private Double currentBid = 0.0;

    @Column(name = "image_url", length = 1000)
    private String imageUrl;

    @Column(name = "cricheroes_profile_url", length = 1000)
    private String cricheroesProfileUrl;

    @Column(name = "cricheroes_player_id")
    private Long cricheroesPlayerId;

    @Column(name = "stats_matches")
    private Integer statsMatches;

    @Column(name = "stats_runs")
    private Integer statsRuns;

    @Column(name = "stats_strike_rate")
    private Double statsStrikeRate;

    @Column(name = "stats_wickets")
    private Integer statsWickets;

    @Column(name = "stats_economy")
    private Double statsEconomy;

    @Column(name = "stats_average")
    private Double statsAverage;

    @Column(name = "stats_last_updated_at")
    private LocalDateTime statsLastUpdatedAt;

    @Column(name = "retained")
    @Builder.Default
    private Boolean retained = false;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private PlayerStatus status = PlayerStatus.AVAILABLE;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tournament_id", nullable = false)
    private Tournament tournament;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id")
    private Team team;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    /** Optional kit/contact fields from Excel upload — export only, not shown in auction UI */
    @Column(name = "extra_data", columnDefinition = "TEXT")
    private String extraData;

    @Enumerated(EnumType.STRING)
    @Column(name = "whatsapp_notify_status", length = 20)
    private WhatsAppNotifyStatus whatsappNotifyStatus;

    @Column(name = "whatsapp_notify_error", length = 500)
    private String whatsappNotifyError;

    @Column(name = "whatsapp_sent_at")
    private LocalDateTime whatsappSentAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (currentBid == null) currentBid = 0.0;
        if (status == null) status = PlayerStatus.AVAILABLE;
        if (retained == null) retained = false;
    }

    public enum PlayerStatus {
        AVAILABLE, IN_AUCTION, SOLD, UNSOLD
    }

    public enum WhatsAppNotifyStatus {
        PENDING, SENT, FAILED, SKIPPED
    }
}
