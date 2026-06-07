package com.cricketauction.service;

import com.cricketauction.entity.AuditLog;
import com.cricketauction.repository.AuditLogRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
@Transactional
public class AuditLogService {
    private final AuditLogRepository auditLogRepository;

    public AuditLogService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    public void record(String action, String entityType, Long entityId, String details) {
        record(action, entityType, entityId, null, details);
    }

    public void record(String action, String entityType, Long entityId, Long tournamentId, String details) {
        auditLogRepository.save(AuditLog.builder()
                .username(currentUsername())
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .tournamentId(tournamentId)
                .details(details)
                .build());
    }

    @Transactional(readOnly = true)
    public Page<AuditLog> latest(String search, int page, int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 50);
        String normalizedSearch = search == null ? "" : search.trim();
        Long numericSearch = parseLong(normalizedSearch);

        return auditLogRepository.findAll((root, query, cb) -> {
            if (normalizedSearch.isBlank()) {
                return cb.conjunction();
            }

            String like = "%" + normalizedSearch.toLowerCase(Locale.ROOT) + "%";
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.like(cb.lower(root.<String>get("details")), like));
            predicates.add(cb.like(cb.lower(root.<String>get("action")), like));
            predicates.add(cb.like(cb.lower(root.<String>get("username")), like));
            predicates.add(cb.like(cb.lower(root.<String>get("entityType")), like));

            if (numericSearch != null) {
                predicates.add(cb.equal(root.get("entityId"), numericSearch));
                predicates.add(cb.equal(root.get("tournamentId"), numericSearch));
            }

            return cb.or(predicates.toArray(Predicate[]::new));
        }, PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "createdAt")));
    }

    private String currentUsername() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getName() != null ? auth.getName() : "system";
    }

    private Long parseLong(String value) {
        if (value == null || value.isBlank()) return null;
        String cleaned = value.trim().replaceFirst("^#", "");
        try {
            return Long.parseLong(cleaned);
        } catch (NumberFormatException ignored) {
            return null;
        }
    }
}
