package com.cricketauction.repository;

import com.cricketauction.entity.FormField;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FormFieldRepository extends JpaRepository<FormField, Long> {
    List<FormField> findByTournamentIdOrderByPositionAsc(Long tournamentId);
    List<FormField> findBySectionIdOrderByPositionAsc(Long sectionId);
    boolean existsByTournamentIdAndFieldKey(Long tournamentId, String fieldKey);
}
