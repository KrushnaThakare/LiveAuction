package com.cricketauction.controller;

import com.cricketauction.dto.ApiResponse;
import com.cricketauction.dto.PlayerRequest;
import com.cricketauction.dto.PlayerResponse;
import com.cricketauction.entity.Player;
import com.cricketauction.service.PlayerService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/tournaments/{tournamentId}/players")
public class PlayerController {

    private final PlayerService playerService;

    public PlayerController(PlayerService playerService) {
        this.playerService = playerService;
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

    @DeleteMapping("/{playerId}")
    public ResponseEntity<ApiResponse<Void>> deletePlayer(
            @PathVariable Long tournamentId,
            @PathVariable Long playerId) {
        playerService.deletePlayer(playerId);
        return ResponseEntity.ok(ApiResponse.success("Player deleted", null));
    }
}
