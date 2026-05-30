package com.cricketauction.controller;

import com.cricketauction.dto.ApiResponse;
import com.cricketauction.dto.AuctionStateResponse;
import com.cricketauction.dto.BroadcastSettingsDto;
import com.cricketauction.dto.TeamResponse;
import com.cricketauction.service.AuctionService;
import com.cricketauction.entity.Tournament;
import com.cricketauction.exception.AuctionException;
import com.cricketauction.service.TeamService;
import com.cricketauction.service.TournamentService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/overlay")
public class OverlayController {
    private final AuctionService auctionService;
    private final TeamService teamService;
    private final TournamentService tournamentService;

    public OverlayController(AuctionService auctionService, TeamService teamService, TournamentService tournamentService) {
        this.auctionService = auctionService;
        this.teamService = teamService;
        this.tournamentService = tournamentService;
    }

    @GetMapping("/{tournamentId}/snapshot")
    public ResponseEntity<ApiResponse<Map<String, Object>>> snapshot(@PathVariable Long tournamentId, @RequestParam(value = "token", required = false) String token) {
        Tournament t = tournamentService.findById(tournamentId);
        validateOverlayAccess(t, token);
        AuctionStateResponse auction = auctionService.getAuctionState(tournamentId);
        List<TeamResponse> teams = teamService.getTeamsByTournament(tournamentId);
        return ResponseEntity.ok(ApiResponse.success(Map.of(
                "auction", auction,
                "teams", teams
        )));
    }

    @GetMapping("/{tournamentId}/config")
    public ResponseEntity<ApiResponse<BroadcastSettingsDto>> config(@PathVariable Long tournamentId, @RequestParam(value = "token", required = false) String token) {
        Tournament t = tournamentService.findById(tournamentId);
        validateOverlayAccess(t, token);
        return ResponseEntity.ok(ApiResponse.success(BroadcastSettingsDto.builder()
                .overlayEnabled(t.getOverlayEnabled())
                .overlayTheme(t.getOverlayTheme())
                .overlayShowTeamBudget(t.getOverlayShowTeamBudget())
                .overlayShowTeamList(t.getOverlayShowTeamList())
                .overlayShowTicker(t.getOverlayShowTicker())
                .tokenEnabled(t.getOverlaySecretToken() != null && !t.getOverlaySecretToken().isBlank())
                .build()));
    }

    private void validateOverlayAccess(Tournament t, String token) {
        if (!Boolean.TRUE.equals(t.getOverlayEnabled())) throw new AuctionException("Overlay is disabled");
        String secret = t.getOverlaySecretToken();
        if (secret != null && !secret.isBlank() && (token == null || !secret.equals(token))) {
            throw new AuctionException("Invalid overlay token");
        }
    }
}

