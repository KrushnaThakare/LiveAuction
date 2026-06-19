package com.cricketauction.controller;

import com.cricketauction.dto.ApiResponse;
import com.cricketauction.dto.BroadcastSettingsDto;
import com.cricketauction.entity.Tournament;
import com.cricketauction.exception.AuctionException;
import com.cricketauction.service.OverlaySnapshotService;
import com.cricketauction.service.PlayerRoleService;
import com.cricketauction.service.TournamentService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/overlay")
public class OverlayController {
    private final OverlaySnapshotService overlaySnapshotService;
    private final TournamentService tournamentService;
    private final PlayerRoleService playerRoleService;

    public OverlayController(OverlaySnapshotService overlaySnapshotService,
                             TournamentService tournamentService,
                             PlayerRoleService playerRoleService) {
        this.overlaySnapshotService = overlaySnapshotService;
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
        return ResponseEntity.ok(ApiResponse.success(
                overlaySnapshotService.getSnapshot(tournamentId, includePlayers)));
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
}

