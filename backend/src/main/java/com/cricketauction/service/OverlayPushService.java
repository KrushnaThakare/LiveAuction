package com.cricketauction.service;

import com.cricketauction.dto.AuctionStateResponse;
import com.cricketauction.dto.TeamResponse;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class OverlayPushService {
    private final AuctionService auctionService;
    private final TeamService teamService;
    private final SimpMessagingTemplate messagingTemplate;

    public OverlayPushService(AuctionService auctionService, TeamService teamService, SimpMessagingTemplate messagingTemplate) {
        this.auctionService = auctionService;
        this.teamService = teamService;
        this.messagingTemplate = messagingTemplate;
    }

    public void pushSnapshot(Long tournamentId) {
        AuctionStateResponse auction = auctionService.getAuctionState(tournamentId);
        pushSnapshotPayload(tournamentId, auction);
    }

    public void pushSnapshot(Long tournamentId, AuctionStateResponse auction) {
        pushSnapshotPayload(tournamentId, auction);
    }

    private void pushSnapshotPayload(Long tournamentId, AuctionStateResponse auction) {
        List<TeamResponse> teams = teamService.getTeamsByTournament(tournamentId);
        Map<String, Object> payload = Map.of("auction", auction, "teams", teams);
        messagingTemplate.convertAndSend("/topic/overlay/" + tournamentId + "/snapshot", payload);
    }
}
