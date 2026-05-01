package com.cricketauction.repository;

import com.cricketauction.entity.PlayerRegistration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PlayerRegistrationRepository extends JpaRepository<PlayerRegistration, Long> {
    List<PlayerRegistration> findByTournamentIdOrderBySubmittedAtDesc(Long tournamentId);
    Optional<PlayerRegistration> findByTournamentIdAndMobile(Long tournamentId, String mobile);
    boolean existsByTournamentIdAndMobile(Long tournamentId, String mobile);
    long countByTournamentId(Long tournamentId);
}
