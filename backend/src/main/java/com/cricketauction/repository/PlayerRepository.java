package com.cricketauction.repository;

import com.cricketauction.entity.Player;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PlayerRepository extends JpaRepository<Player, Long> {
    List<Player> findByTournamentId(Long tournamentId);
    List<Player> findByTournamentIdAndStatus(Long tournamentId, Player.PlayerStatus status);
    List<Player> findByTournamentIdAndTeamId(Long tournamentId, Long teamId);
    long countByTournamentIdAndStatus(Long tournamentId, Player.PlayerStatus status);
}
