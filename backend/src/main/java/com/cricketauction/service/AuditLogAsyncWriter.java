package com.cricketauction.service;

import com.cricketauction.entity.AuditLog;
import com.cricketauction.repository.AuditLogRepository;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuditLogAsyncWriter {
    private final AuditLogRepository auditLogRepository;

    public AuditLogAsyncWriter(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @Async("auditLogExecutor")
    @Transactional
    public void write(String username, String action, String entityType, Long entityId,
                      Long tournamentId, String details) {
        auditLogRepository.save(AuditLog.builder()
                .username(username)
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .tournamentId(tournamentId)
                .details(details)
                .build());
    }
}
