package com.cricketauction.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "auction_sessions")
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

    // ── Undo metadata — stored so we can fully reverse a SOLD or UNSOLD decision ──

    /** The team this player was sold to (kept for undo even after FKs are nulled) */
    @Column(name = "undo_team_id")
    private Long undoTeamId;

    /** The amount that was deducted from the team's budget */
    @Column(name = "undo_amount")
    private Double undoAmount;

    /** The player id (kept for undo even after current_player_id is nulled) */
    @Column(name = "undo_player_id")
    private Long undoPlayerId;

    /** Previous player status before this session closed */
    @Enumerated(EnumType.STRING)
    @Column(name = "undo_previous_player_status")
    private Player.PlayerStatus undoPreviousPlayerStatus;

    public enum AuctionStatus {
        IDLE, ACTIVE, SOLD, UNSOLD, UNDONE
    }
}
