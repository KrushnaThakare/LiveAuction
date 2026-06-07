package com.cricketauction.controller;

import com.cricketauction.dto.ApiResponse;
import com.cricketauction.entity.AuditLog;
import com.cricketauction.service.AuditLogService;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
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
    public ResponseEntity<ApiResponse<AuditLogPageResponse>> latest(
            @RequestParam(defaultValue = "") String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        Page<AuditLog> logs = auditLogService.latest(search, page, size);
        return ResponseEntity.ok(ApiResponse.success(AuditLogPageResponse.from(logs)));
    }

    public record AuditLogResponse(
            Long id,
            String username,
            String action,
            String entityType,
            Long entityId,
            Long tournamentId,
            String details,
            LocalDateTime createdAt
    ) {
        static AuditLogResponse from(AuditLog log) {
            return new AuditLogResponse(log.getId(), log.getUsername(), log.getAction(),
                    log.getEntityType(), log.getEntityId(), log.getTournamentId(), log.getDetails(), log.getCreatedAt());
        }
    }

    public record AuditLogPageResponse(
            List<AuditLogResponse> content,
            int page,
            int size,
            long totalElements,
            int totalPages,
            boolean first,
            boolean last
    ) {
        static AuditLogPageResponse from(Page<AuditLog> logs) {
            return new AuditLogPageResponse(
                    logs.getContent().stream().map(AuditLogResponse::from).toList(),
                    logs.getNumber(),
                    logs.getSize(),
                    logs.getTotalElements(),
                    logs.getTotalPages(),
                    logs.isFirst(),
                    logs.isLast());
        }
    }
}
