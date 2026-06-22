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
import com.cricketauction.service.PlayerRoleService;
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
    private final PlayerRoleService playerRoleService;

    public OverlayController(AuctionService auctionService, TeamService teamService, TournamentService tournamentService, PlayerRoleService playerRoleService) {
        this.auctionService = auctionService;
        this.teamService = teamService;
        this.tournamentService = tournamentService;
        this.playerRoleService = playerRoleService;
    }

    @GetMapping("/{tournamentId}/snapshot")
    public ResponseEntity<ApiResponse<Map<String, Object>>> snapshot(
            @PathVariable Long tournamentId,
            @RequestParam(value = "token", required = false) String token,
            @RequestParam(value = "includePlayers", defaultValue = "false") boolean includePlayers) {
        Tournament t = tournamentService.findById(tournamentId);
        validateOverlayAccess(t, token);
        AuctionStateResponse auction = auctionService.getAuctionState(tournamentId);
        List<TeamResponse> teams = includePlayers
                ? teamService.getTeamsByTournament(tournamentId)
                : teamService.getTeamSummariesByTournament(tournamentId);
        return ResponseEntity.ok(ApiResponse.success(Map.of(
                "auction", auction,
                "teams", teams
        )));
    }

    @GetMapping("/{tournamentId}/config")
    public ResponseEntity<ApiResponse<BroadcastSettingsDto>> config(@PathVariable Long tournamentId, @RequestParam(value = "token", required = false) String token) {
        Tournament t = tournamentService.findById(tournamentId);
        if (Boolean.TRUE.equals(t.getOverlayEnabled())) {
            validateOverlayAccess(t, token);
        }
        return ResponseEntity.ok(ApiResponse.success(mapConfig(t)));
    }

    private BroadcastSettingsDto mapConfig(Tournament t) {
        return BroadcastSettingsDto.builder()
                .overlayEnabled(t.getOverlayEnabled())
                .overlayTheme(t.getOverlayTheme())
                .overlayShowTeamBudget(t.getOverlayShowTeamBudget())
                .overlayShowTeamList(t.getOverlayShowTeamList())
                .overlayShowTicker(t.getOverlayShowTicker())
                .overlayShowPlayerStatsIntro(t.getOverlayShowPlayerStatsIntro())
                .overlayPlayerStatsIntroMs(t.getOverlayPlayerStatsIntroMs())
                .overlayShowCinematicIntro(t.getOverlayShowCinematicIntro())
                .overlayCinematicIntroLive(t.getOverlayCinematicIntroLive())
                .overlayShowPlayerTransition(t.getOverlayShowPlayerTransition())
                .overlayShowBidPop(t.getOverlayShowBidPop())
                .overlayShowSquadFormation(t.getOverlayShowSquadFormation())
                .maxSquadSize(squadSizeOrDefault(t.getMaxSquadSize()))
                .tokenEnabled(t.getOverlaySecretToken() != null && !t.getOverlaySecretToken().isBlank())
                .tournamentName(t.getName())
                .auctionDisplayName(t.getAuctionDisplayName())
                .logoUrl(t.getLogoUrl())
                .sport(t.getSport() == null ? "CRICKET" : t.getSport())
                .playerRoles(playerRoleService.getRoles(t))
                .build();
    }

    private void validateOverlayAccess(Tournament t, String token) {
        if (!Boolean.TRUE.equals(t.getOverlayEnabled())) {
            throw new AuctionException("Broadcast currently disabled by Admin");
        }
        String secret = t.getOverlaySecretToken();
        if (secret != null && !secret.isBlank() && (token == null || !secret.equals(token))) {
            throw new AuctionException("Invalid overlay token");
        }
    }

    private static int squadSizeOrDefault(Integer value) {
        if (value == null) return 15;
        return Math.max(5, Math.min(30, value));
    }
}

