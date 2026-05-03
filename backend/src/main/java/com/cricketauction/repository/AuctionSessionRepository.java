package com.cricketauction.repository;

import com.cricketauction.entity.AuctionSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AuctionSessionRepository extends JpaRepository<AuctionSession, Long> {
    Optional<AuctionSession> findByTournamentIdAndStatus(Long tournamentId, AuctionSession.AuctionStatus status);
    Optional<AuctionSession> findTopByTournamentIdOrderByIdDesc(Long tournamentId);
    List<AuctionSession> findByTournamentId(Long tournamentId);

    /** Null out FK references so cascade delete on Tournament can proceed */
    @Modifying
    @Query("UPDATE AuctionSession s SET s.currentPlayer = null, s.highestBidderTeam = null WHERE s.tournament.id = :tournamentId")
    void nullifyForeignKeysForTournament(Long tournamentId);

    /**
     * Null out current_player_id on any CLOSED sessions that reference this player.
     * Called before starting a new session for the same player (re-auction).
     * This makes the UNIQUE constraint irrelevant — the old rows no longer reference
     * this player, so the new row can safely use current_player_id = playerId.
     */
    @Modifying
    @Query("UPDATE AuctionSession s SET s.currentPlayer = null WHERE s.currentPlayer.id = :playerId AND s.status IN ('SOLD','UNSOLD')")
    void nullifyPlayerFromClosedSessions(Long playerId);
}
