package com.cricketauction.repository;

import com.cricketauction.entity.FormSection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FormSectionRepository extends JpaRepository<FormSection, Long> {
    List<FormSection> findByTournamentIdOrderByPositionAsc(Long tournamentId);
    void deleteByTournamentId(Long tournamentId);
}
