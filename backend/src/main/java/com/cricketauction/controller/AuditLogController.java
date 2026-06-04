package com.cricketauction.controller;

import com.cricketauction.dto.ApiResponse;
import com.cricketauction.entity.AuditLog;
import com.cricketauction.service.AuditLogService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/audit-logs")
public class AuditLogController {
    private final AuditLogService auditLogService;

    public AuditLogController(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<AuditLogResponse>>> latest() {
        return ResponseEntity.ok(ApiResponse.success(
                auditLogService.latest().stream().map(AuditLogResponse::from).toList()));
    }

    public record AuditLogResponse(
            Long id,
            String username,
            String action,
            String entityType,
            Long entityId,
            String details,
            LocalDateTime createdAt
    ) {
        static AuditLogResponse from(AuditLog log) {
            return new AuditLogResponse(log.getId(), log.getUsername(), log.getAction(),
                    log.getEntityType(), log.getEntityId(), log.getDetails(), log.getCreatedAt());
        }
    }
}
