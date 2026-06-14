package com.cricketauction.repository;

import com.cricketauction.entity.Player;
import org.springframework.data.jpa.repository.JpaRepository;
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
    @Query("select p.team.id, count(p) from Player p where p.tournament.id = :tournamentId and p.team is not null group by p.team.id")
    List<Object[]> countPlayersByTeamForTournament(@Param("tournamentId") Long tournamentId);
    void deleteByTournamentId(Long tournamentId);
}
