package com.cricketauction.controller;

import com.cricketauction.dto.ApiResponse;
import com.cricketauction.dto.PlayerRequest;
import com.cricketauction.dto.PlayerResponse;
import com.cricketauction.entity.Player;
import com.cricketauction.service.PlayerService;
import com.cricketauction.service.WhatsAppNotifyService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tournaments/{tournamentId}/players")
public class PlayerController {

    private final PlayerService playerService;
    private final WhatsAppNotifyService whatsAppNotifyService;

    public PlayerController(PlayerService playerService, WhatsAppNotifyService whatsAppNotifyService) {
        this.playerService = playerService;
        this.whatsAppNotifyService = whatsAppNotifyService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<PlayerResponse>> createPlayer(
            @PathVariable Long tournamentId,
            @Valid @RequestBody PlayerRequest request) {
        PlayerResponse player = playerService.createPlayer(tournamentId, request);
        return ResponseEntity.ok(ApiResponse.success("Player added", player));
    }

    @PostMapping("/upload")
    public ResponseEntity<ApiResponse<List<PlayerResponse>>> uploadPlayers(
            @PathVariable Long tournamentId,
            @RequestParam("file") MultipartFile file) {
        try {
            List<PlayerResponse> players = playerService.uploadPlayers(tournamentId, file);
            return ResponseEntity.ok(ApiResponse.success(
                    players.size() + " players uploaded successfully", players));
        } catch (IOException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Failed to parse Excel file: " + e.getMessage()));
        }
    }

    @PostMapping("/repair-roles")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> repairRoles(@PathVariable Long tournamentId) {
        int updated = playerService.repairRolesFromExtraData(tournamentId);
        return ResponseEntity.ok(ApiResponse.success(
                "Repaired roles for " + updated + " player(s)",
                Map.of("updated", updated)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<PlayerResponse>>> getPlayers(
            @PathVariable Long tournamentId,
            @RequestParam(required = false) Player.PlayerStatus status) {
        List<PlayerResponse> players = status != null
                ? playerService.getPlayersByStatus(tournamentId, status)
                : playerService.getPlayersByTournament(tournamentId);
        return ResponseEntity.ok(ApiResponse.success(players));
    }

    @GetMapping("/{playerId}")
    public ResponseEntity<ApiResponse<PlayerResponse>> getPlayerById(
            @PathVariable Long tournamentId,
            @PathVariable Long playerId) {
        return ResponseEntity.ok(ApiResponse.success(playerService.getPlayerById(playerId)));
    }

    @PutMapping("/{playerId}")
    public ResponseEntity<ApiResponse<PlayerResponse>> updatePlayer(
            @PathVariable Long tournamentId,
            @PathVariable Long playerId,
            @Valid @RequestBody PlayerRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Player updated", playerService.updatePlayer(playerId, request)));
    }

    @PostMapping("/{playerId}/cricheroes/fetch-stats")
    public ResponseEntity<ApiResponse<PlayerResponse>> fetchCricHeroesStats(
            @PathVariable Long tournamentId,
            @PathVariable Long playerId) {
        return ResponseEntity.ok(ApiResponse.success("CricHeroes stats refreshed", playerService.fetchCricHeroesStats(playerId)));
    }

    @PostMapping("/cricheroes/clean-invalid")
    public ResponseEntity<ApiResponse<Integer>> cleanInvalidCricHeroesProfiles(@PathVariable Long tournamentId) {
        int cleaned = playerService.cleanInvalidCricHeroesProfiles(tournamentId);
        return ResponseEntity.ok(ApiResponse.success("Invalid CricHeroes profile values cleaned", cleaned));
    }

    @DeleteMapping("/{playerId}")
    public ResponseEntity<ApiResponse<Void>> deletePlayer(
            @PathVariable Long tournamentId,
            @PathVariable Long playerId) {
        playerService.deletePlayer(playerId);
        return ResponseEntity.ok(ApiResponse.success("Player deleted", null));
    }

    /** Retry automatic WhatsApp congratulations for a sold player */
    @PostMapping("/{playerId}/whatsapp/retry")
    public ResponseEntity<ApiResponse<PlayerResponse>> retryWhatsApp(
            @PathVariable Long tournamentId,
            @PathVariable Long playerId) {
        whatsAppNotifyService.sendSoldNotification(tournamentId, playerId);
        return ResponseEntity.ok(ApiResponse.success(
                "WhatsApp notification processed",
                playerService.getPlayerById(playerId)));
    }

    /** Retry automatic WhatsApp for multiple sold players */
    @PostMapping("/whatsapp/retry")
    public ResponseEntity<ApiResponse<List<PlayerResponse>>> retryWhatsAppBulk(
            @PathVariable Long tournamentId,
            @RequestBody Map<String, List<Long>> body) {
        List<Long> playerIds = body.getOrDefault("playerIds", List.of());
        for (Long playerId : playerIds) {
            whatsAppNotifyService.sendSoldNotification(tournamentId, playerId);
        }
        List<PlayerResponse> players = playerService.getPlayersByStatus(tournamentId, Player.PlayerStatus.SOLD);
        return ResponseEntity.ok(ApiResponse.success("WhatsApp notifications processed", players));
    }
}
