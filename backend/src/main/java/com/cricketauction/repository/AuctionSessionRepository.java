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
     * Uses native SQL so it is not JPQL-validated during schema creation on H2.
     */
    @Modifying
    @Query(value = "UPDATE auction_sessions SET current_player_id = NULL WHERE current_player_id = :playerId AND status IN ('SOLD','UNSOLD')",
           nativeQuery = true)
    void nullifyPlayerFromClosedSessions(Long playerId);
}
