package com.cricketauction.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
// suppress unused import warning — Index is used in @Table annotation
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "auction_sessions",
       indexes = {
           @Index(name = "idx_auction_sessions_tournament", columnList = "tournament_id"),
           @Index(name = "idx_auction_sessions_status",     columnList = "status"),
       })
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuctionSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tournament_id", nullable = false)
    private Tournament tournament;

    // ManyToOne (not OneToOne) so the same player can appear in multiple sessions
    // (e.g. when re-auctioned after being unsold). OneToOne creates a UNIQUE
    // constraint on current_player_id which causes a duplicate-key error on re-auction.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "current_player_id")
    private Player currentPlayer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "highest_bidder_team_id")
    private Team highestBidderTeam;

    @Column(name = "current_bid")
    @Builder.Default
    private Double currentBid = 0.0;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private AuctionStatus status = AuctionStatus.IDLE;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "ended_at")
    private LocalDateTime endedAt;

    public enum AuctionStatus {
        IDLE, ACTIVE, SOLD, UNSOLD
    }
}
