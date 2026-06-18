package com.cricketauction.service;

import com.cricketauction.dto.AuctionStateResponse;
import com.cricketauction.dto.TeamResponse;
import com.cricketauction.entity.Tournament;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class OverlayPushService {
    private final AuctionService auctionService;
    private final TeamService teamService;
    private final TournamentService tournamentService;
    private final SimpMessagingTemplate messagingTemplate;

    public OverlayPushService(AuctionService auctionService,
                              TeamService teamService,
                              TournamentService tournamentService,
                              SimpMessagingTemplate messagingTemplate) {
        this.auctionService = auctionService;
        this.teamService = teamService;
        this.tournamentService = tournamentService;
        this.messagingTemplate = messagingTemplate;
    }

    @Async("overlayPushExecutor")
    public void pushSnapshot(Long tournamentId) {
        AuctionStateResponse auction = auctionService.getAuctionState(tournamentId);
        pushSnapshotPayload(tournamentId, auction, true);
    }

    @Async("overlayPushExecutor")
    public void pushSnapshot(Long tournamentId, AuctionStateResponse auction) {
        pushSnapshotPayload(tournamentId, auction, true);
    }

    @Async("overlayPushExecutor")
    public void pushLightweightSnapshot(Long tournamentId, AuctionStateResponse auction) {
        pushSnapshotPayload(tournamentId, auction, false);
    }

    @Async("overlayPushExecutor")
    public void pushLightweightSnapshot(Long tournamentId) {
        AuctionStateResponse auction = auctionService.getAuctionState(tournamentId);
        pushSnapshotPayload(tournamentId, auction, false);
    }

    @Async("overlayPushExecutor")
    public void pushBroadcastDisabled(Long tournamentId) {
        messagingTemplate.convertAndSend("/topic/overlay/" + tournamentId + "/snapshot",
                Map.of("broadcastDisabled", true));
    }

    private void pushSnapshotPayload(Long tournamentId, AuctionStateResponse auction, boolean includePlayers) {
        Tournament tournament = tournamentService.findById(tournamentId);
        if (!Boolean.TRUE.equals(tournament.getOverlayEnabled())) {
            return;
        }
        List<TeamResponse> teams = includePlayers
                ? teamService.getTeamsByTournament(tournamentId)
                : teamService.getTeamSummariesByTournament(tournamentId);
        Map<String, Object> payload = Map.of("auction", auction, "teams", teams);
        messagingTemplate.convertAndSend("/topic/overlay/" + tournamentId + "/snapshot", payload);
    }
}
