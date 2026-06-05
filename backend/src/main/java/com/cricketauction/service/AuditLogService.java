package com.cricketauction.service;

import com.cricketauction.entity.AuditLog;
import com.cricketauction.repository.AuditLogRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

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
    public List<AuditLog> latest() {
        return auditLogRepository.findTop200ByOrderByCreatedAtDesc();
    }

    @Transactional(readOnly = true)
    public List<AuditLog> latestAuctionLogs(Long tournamentId) {
        return auditLogRepository.findTop100ByTournamentIdAndActionInOrderByCreatedAtDesc(
                tournamentId,
                List.of("AUCTION_STARTED", "CALLING_BID_UPDATED", "BID_ASSIGNED", "PLAYER_SOLD", "PLAYER_UNSOLD"));
    }

    private String currentUsername() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getName() != null ? auth.getName() : "system";
    }
}
