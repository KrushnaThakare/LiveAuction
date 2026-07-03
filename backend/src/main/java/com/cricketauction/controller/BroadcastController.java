package com.cricketauction.controller;

import com.cricketauction.dto.ApiResponse;
import com.cricketauction.dto.BroadcastSettingsDto;
import com.cricketauction.entity.Tournament;
import com.cricketauction.service.OverlayAudienceSignalService;
import com.cricketauction.service.OverlayPushService;
import com.cricketauction.service.TournamentService;
import com.cricketauction.service.WhatsAppNotifyService;
import com.cricketauction.util.OverlayDetailFieldsUtil;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/tournaments/{tournamentId}/broadcast")
public class BroadcastController {
    private final TournamentService tournamentService;
    private final OverlayPushService overlayPushService;
    private final WhatsAppNotifyService whatsAppNotifyService;
    private final OverlayAudienceSignalService overlayAudienceSignalService;

    public BroadcastController(TournamentService tournamentService,
                               OverlayPushService overlayPushService,
                               WhatsAppNotifyService whatsAppNotifyService,
                               OverlayAudienceSignalService overlayAudienceSignalService) {
        this.tournamentService = tournamentService;
        this.overlayPushService = overlayPushService;
        this.whatsAppNotifyService = whatsAppNotifyService;
        this.overlayAudienceSignalService = overlayAudienceSignalService;
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
        if (d.getPublicViewShowTeams() != null) t.setPublicViewShowTeams(d.getPublicViewShowTeams());
        if (d.getPublicViewShowSold() != null) t.setPublicViewShowSold(d.getPublicViewShowSold());
        if (d.getPublicViewShowUnsold() != null) t.setPublicViewShowUnsold(d.getPublicViewShowUnsold());
        if (d.getOverlayShowPlayerStatsIntro() != null) t.setOverlayShowPlayerStatsIntro(d.getOverlayShowPlayerStatsIntro());
        if (d.getOverlayPlayerStatsIntroMs() != null) {
            t.setOverlayPlayerStatsIntroMs(Math.max(1000, Math.min(15000, d.getOverlayPlayerStatsIntroMs())));
        }
        if (d.getOverlayShowCinematicIntro() != null) t.setOverlayShowCinematicIntro(d.getOverlayShowCinematicIntro());
        if (d.getOverlayCinematicIntroLive() != null) t.setOverlayCinematicIntroLive(d.getOverlayCinematicIntroLive());
        if (d.getOverlayShowPlayerTransition() != null) t.setOverlayShowPlayerTransition(d.getOverlayShowPlayerTransition());
        if (d.getOverlayShowBidPop() != null) t.setOverlayShowBidPop(d.getOverlayShowBidPop());
        if (d.getOverlayShowSquadFormation() != null) t.setOverlayShowSquadFormation(d.getOverlayShowSquadFormation());
        if (d.getMaxSquadSize() != null) t.setMaxSquadSize(squadSizeOrDefault(d.getMaxSquadSize()));
        if (d.getWhatsappAutoEnabled() != null) t.setWhatsappAutoEnabled(d.getWhatsappAutoEnabled());
        if (Boolean.FALSE.equals(d.getTokenEnabled())) t.setOverlaySecretToken(null);
        if (d.getOverlaySecretToken() != null) t.setOverlaySecretToken(d.getOverlaySecretToken().isBlank() ? null : d.getOverlaySecretToken());
        if (d.getOverlayAudienceDetailFields() != null) {
            t.setOverlayAudienceDetailFields(OverlayDetailFieldsUtil.serialize(d.getOverlayAudienceDetailFields()));
        }
        if (d.getOverlayMainDetailFields() != null) {
            t.setOverlayMainDetailFields(OverlayDetailFieldsUtil.serialize(d.getOverlayMainDetailFields()));
        }
        if (d.getOverlayShowRecordBreak() != null) t.setOverlayShowRecordBreak(d.getOverlayShowRecordBreak());
        if (d.getOverlayCountdownSeconds() != null) {
            t.setOverlayCountdownSeconds(countdownSecondsOrDefault(d.getOverlayCountdownSeconds()));
        }
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

    /** Audience Display only — triggers tournament countdown cinematic on studio overlay */
    @PostMapping("/countdown")
    public ResponseEntity<ApiResponse<BroadcastSettingsDto>> triggerCountdown(
            @PathVariable Long tournamentId,
            @RequestBody(required = false) BroadcastSettingsDto d) {
        Tournament t = tournamentService.findById(tournamentId);
        int seconds = countdownSecondsOrDefault(d != null ? d.getOverlayCountdownSeconds() : t.getOverlayCountdownSeconds());
        overlayAudienceSignalService.triggerCountdown(tournamentId, seconds);
        overlayPushService.pushStudioSnapshot(tournamentId);
        return ResponseEntity.ok(ApiResponse.success("Countdown triggered", map(t, false)));
    }

    private BroadcastSettingsDto map(Tournament t, boolean includeSecret) {
        return BroadcastSettingsDto.builder()
                .overlayEnabled(t.getOverlayEnabled())
                .overlayTheme(t.getOverlayTheme())
                .overlayShowTeamBudget(t.getOverlayShowTeamBudget())
                .overlayShowTeamList(t.getOverlayShowTeamList())
                .overlayShowTicker(t.getOverlayShowTicker())
                .publicViewShowTeams(t.getPublicViewShowTeams())
                .publicViewShowSold(t.getPublicViewShowSold())
                .publicViewShowUnsold(t.getPublicViewShowUnsold())
                .overlayShowPlayerStatsIntro(t.getOverlayShowPlayerStatsIntro())
                .overlayPlayerStatsIntroMs(t.getOverlayPlayerStatsIntroMs())
                .overlayShowCinematicIntro(t.getOverlayShowCinematicIntro())
                .overlayCinematicIntroLive(t.getOverlayCinematicIntroLive())
                .overlayShowPlayerTransition(t.getOverlayShowPlayerTransition())
                .overlayShowBidPop(t.getOverlayShowBidPop())
                .overlayShowSquadFormation(t.getOverlayShowSquadFormation())
                .maxSquadSize(squadSizeOrDefault(t.getMaxSquadSize()))
                .tokenEnabled(t.getOverlaySecretToken() != null && !t.getOverlaySecretToken().isBlank())
                .overlaySecretToken(includeSecret ? t.getOverlaySecretToken() : null)
                .whatsappAutoEnabled(t.getWhatsappAutoEnabled())
                .whatsappConfigured(whatsAppNotifyService.isConfigured())
                .overlayAudienceDetailFields(OverlayDetailFieldsUtil.parse(t.getOverlayAudienceDetailFields()))
                .overlayMainDetailFields(OverlayDetailFieldsUtil.parse(t.getOverlayMainDetailFields()))
                .overlayShowRecordBreak(t.getOverlayShowRecordBreak())
                .overlayCountdownSeconds(countdownSecondsOrDefault(t.getOverlayCountdownSeconds()))
                .build();
    }

    private static int countdownSecondsOrDefault(Integer value) {
        if (value == null) return 5;
        if (value <= 7) return 5;
        if (value <= 12) return 10;
        return 15;
    }

    private static int squadSizeOrDefault(Integer value) {
        if (value == null) return 15;
        return Math.max(5, Math.min(30, value));
    }
}
