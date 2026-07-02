package com.cricketauction.repository;

import com.cricketauction.entity.Player;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PlayerRepository extends JpaRepository<Player, Long> {
    List<Player> findByTournamentId(Long tournamentId);
    List<Player> findByTournamentIdAndStatus(Long tournamentId, Player.PlayerStatus status);
    List<Player> findByTournamentIdAndTeamId(Long tournamentId, Long teamId);
    long countByTournamentIdAndStatus(Long tournamentId, Player.PlayerStatus status);

    @Query(value = "SELECT id FROM players WHERE tournament_id = :tournamentId AND status = :status ORDER BY RAND() LIMIT 1",
            nativeQuery = true)
    Optional<Long> findRandomIdByTournamentIdAndStatus(@Param("tournamentId") Long tournamentId,
                                                       @Param("status") String status);

    @Modifying
    @Query(value = "UPDATE players SET status = 'AVAILABLE', current_bid = 0 WHERE tournament_id = :tournamentId AND status = 'UNSOLD'",
            nativeQuery = true)
    int resetUnsoldToAvailable(@Param("tournamentId") Long tournamentId);

    @Query("select p.team.id, count(p) from Player p where p.tournament.id = :tournamentId and p.team is not null group by p.team.id")
    List<Object[]> countPlayersByTeamForTournament(@Param("tournamentId") Long tournamentId);

    @Query(value = "SELECT COALESCE(MAX(current_bid), 0) FROM players WHERE tournament_id = :tournamentId AND status = 'SOLD'",
            nativeQuery = true)
    Double findMaxSoldBidByTournament(@Param("tournamentId") Long tournamentId);

    void deleteByTournamentId(Long tournamentId);
}
