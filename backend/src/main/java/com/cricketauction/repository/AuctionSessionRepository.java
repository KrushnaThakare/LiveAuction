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
}
