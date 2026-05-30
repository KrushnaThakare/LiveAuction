package com.cricketauction.repository;

import com.cricketauction.entity.BidRule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BidRuleRepository extends JpaRepository<BidRule, Long> {
    List<BidRule> findByTournamentIdOrderByPositionAscMinAmountAsc(Long tournamentId);
    void deleteByTournamentId(Long tournamentId);
}
