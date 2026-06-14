package com.cricketauction.controller;

import com.cricketauction.dto.ApiResponse;
import com.cricketauction.dto.BroadcastSettingsDto;
import com.cricketauction.entity.Tournament;
import com.cricketauction.service.OverlayPushService;
import com.cricketauction.service.TournamentService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/tournaments/{tournamentId}/broadcast")
public class BroadcastController {
    private final TournamentService tournamentService;
    private final OverlayPushService overlayPushService;

    public BroadcastController(TournamentService tournamentService, OverlayPushService overlayPushService) {
        this.tournamentService = tournamentService;
        this.overlayPushService = overlayPushService;
    }

    @GetMapping("/settings")
    public ResponseEntity<ApiResponse<BroadcastSettingsDto>> get(@PathVariable Long tournamentId) {
        Tournament t = tournamentService.findById(tournamentId);
        return ResponseEntity.ok(ApiResponse.success(map(t, false)));
    }

    @PutMapping("/settings")
    public ResponseEntity<ApiResponse<BroadcastSettingsDto>> put(@PathVariable Long tournamentId, @RequestBody BroadcastSettingsDto d) {
        Tournament t = tournamentService.findById(tournamentId);
        boolean wasEnabled = Boolean.TRUE.equals(t.getOverlayEnabled());
        if (d.getOverlayEnabled() != null) t.setOverlayEnabled(d.getOverlayEnabled());
        if (d.getOverlayTheme() != null) t.setOverlayTheme(d.getOverlayTheme());
        if (d.getOverlayShowTeamBudget() != null) t.setOverlayShowTeamBudget(d.getOverlayShowTeamBudget());
        if (d.getOverlayShowTeamList() != null) t.setOverlayShowTeamList(d.getOverlayShowTeamList());
        if (d.getOverlayShowTicker() != null) t.setOverlayShowTicker(d.getOverlayShowTicker());
        if (d.getOverlayShowPlayerStatsIntro() != null) t.setOverlayShowPlayerStatsIntro(d.getOverlayShowPlayerStatsIntro());
        if (d.getOverlayPlayerStatsIntroMs() != null) {
            t.setOverlayPlayerStatsIntroMs(Math.max(1000, Math.min(15000, d.getOverlayPlayerStatsIntroMs())));
        }
        if (Boolean.FALSE.equals(d.getTokenEnabled())) t.setOverlaySecretToken(null);
        if (d.getOverlaySecretToken() != null) t.setOverlaySecretToken(d.getOverlaySecretToken().isBlank() ? null : d.getOverlaySecretToken());
        tournamentService.saveTournament(t);
        if (wasEnabled && Boolean.FALSE.equals(t.getOverlayEnabled())) {
            overlayPushService.pushBroadcastDisabled(tournamentId);
        }
        return ResponseEntity.ok(ApiResponse.success("Broadcast settings updated", map(t, true)));
    }

    private BroadcastSettingsDto map(Tournament t, boolean includeSecret) {
        return BroadcastSettingsDto.builder()
                .overlayEnabled(t.getOverlayEnabled())
                .overlayTheme(t.getOverlayTheme())
                .overlayShowTeamBudget(t.getOverlayShowTeamBudget())
                .overlayShowTeamList(t.getOverlayShowTeamList())
                .overlayShowTicker(t.getOverlayShowTicker())
                .overlayShowPlayerStatsIntro(t.getOverlayShowPlayerStatsIntro())
                .overlayPlayerStatsIntroMs(t.getOverlayPlayerStatsIntroMs())
                .tokenEnabled(t.getOverlaySecretToken() != null && !t.getOverlaySecretToken().isBlank())
                .overlaySecretToken(includeSecret ? t.getOverlaySecretToken() : null)
                .build();
    }
}
