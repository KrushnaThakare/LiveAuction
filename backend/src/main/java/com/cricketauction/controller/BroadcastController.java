package com.cricketauction.controller;

import com.cricketauction.dto.ApiResponse;
import com.cricketauction.dto.BroadcastSettingsDto;
import com.cricketauction.entity.Tournament;
import com.cricketauction.service.OverlayPushService;
import com.cricketauction.service.TournamentService;
import com.cricketauction.service.WhatsAppNotifyService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/tournaments/{tournamentId}/broadcast")
public class BroadcastController {
    private final TournamentService tournamentService;
    private final OverlayPushService overlayPushService;
    private final WhatsAppNotifyService whatsAppNotifyService;

    public BroadcastController(TournamentService tournamentService,
                               OverlayPushService overlayPushService,
                               WhatsAppNotifyService whatsAppNotifyService) {
        this.tournamentService = tournamentService;
        this.overlayPushService = overlayPushService;
        this.whatsAppNotifyService = whatsAppNotifyService;
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
        if (d.getOverlayShowCinematicIntro() != null) t.setOverlayShowCinematicIntro(d.getOverlayShowCinematicIntro());
        if (d.getOverlayCinematicIntroLive() != null) t.setOverlayCinematicIntroLive(d.getOverlayCinematicIntroLive());
        if (d.getOverlayShowPlayerTransition() != null) t.setOverlayShowPlayerTransition(d.getOverlayShowPlayerTransition());
        if (d.getOverlayShowBidPop() != null) t.setOverlayShowBidPop(d.getOverlayShowBidPop());
        if (d.getOverlayShowSquadFormation() != null) t.setOverlayShowSquadFormation(d.getOverlayShowSquadFormation());
        if (d.getWhatsappAutoEnabled() != null) t.setWhatsappAutoEnabled(d.getWhatsappAutoEnabled());
        if (Boolean.FALSE.equals(d.getTokenEnabled())) t.setOverlaySecretToken(null);
        if (d.getOverlaySecretToken() != null) t.setOverlaySecretToken(d.getOverlaySecretToken().isBlank() ? null : d.getOverlaySecretToken());
        tournamentService.saveTournament(t);
        if (wasEnabled && Boolean.FALSE.equals(t.getOverlayEnabled())) {
            overlayPushService.pushBroadcastDisabled(tournamentId);
        }
        return ResponseEntity.ok(ApiResponse.success("Broadcast settings updated", map(t, true)));
    }

    /** Instant runtime toggle for cinematic intro during live auction */
    @PatchMapping("/cinematic-intro-live")
    public ResponseEntity<ApiResponse<BroadcastSettingsDto>> setCinematicIntroLive(
            @PathVariable Long tournamentId,
            @RequestBody BroadcastSettingsDto d) {
        Tournament t = tournamentService.findById(tournamentId);
        if (d.getOverlayCinematicIntroLive() != null) {
            t.setOverlayCinematicIntroLive(d.getOverlayCinematicIntroLive());
            tournamentService.saveTournament(t);
            overlayPushService.pushLightweightSnapshot(tournamentId);
        }
        return ResponseEntity.ok(ApiResponse.success(map(t, false)));
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
                .overlayShowCinematicIntro(t.getOverlayShowCinematicIntro())
                .overlayCinematicIntroLive(t.getOverlayCinematicIntroLive())
                .overlayShowPlayerTransition(t.getOverlayShowPlayerTransition())
                .overlayShowBidPop(t.getOverlayShowBidPop())
                .overlayShowSquadFormation(t.getOverlayShowSquadFormation())
                .tokenEnabled(t.getOverlaySecretToken() != null && !t.getOverlaySecretToken().isBlank())
                .overlaySecretToken(includeSecret ? t.getOverlaySecretToken() : null)
                .whatsappAutoEnabled(t.getWhatsappAutoEnabled())
                .whatsappConfigured(whatsAppNotifyService.isConfigured())
                .build();
    }
}
