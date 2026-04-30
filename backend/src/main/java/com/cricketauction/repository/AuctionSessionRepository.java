package com.cricketauction.repository;

import com.cricketauction.entity.AuctionSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AuctionSessionRepository extends JpaRepository<AuctionSession, Long> {
    Optional<AuctionSession> findByTournamentIdAndStatus(Long tournamentId, AuctionSession.AuctionStatus status);
    Optional<AuctionSession> findTopByTournamentIdOrderByIdDesc(Long tournamentId);
}
