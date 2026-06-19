package com.cricketauction.service;

import com.cricketauction.dto.AuctionStateResponse;
import com.cricketauction.entity.Tournament;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class OverlayPushService {
    private final AuctionService auctionService;
    private final OverlaySnapshotService overlaySnapshotService;
    private final TournamentService tournamentService;
    private final SimpMessagingTemplate messagingTemplate;

    public OverlayPushService(AuctionService auctionService,
                              OverlaySnapshotService overlaySnapshotService,
                              TournamentService tournamentService,
                              SimpMessagingTemplate messagingTemplate) {
        this.auctionService = auctionService;
        this.overlaySnapshotService = overlaySnapshotService;
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
        Map<String, Object> payload = overlaySnapshotService.cacheSnapshot(tournamentId, includePlayers, auction);
        messagingTemplate.convertAndSend("/topic/overlay/" + tournamentId + "/snapshot", payload);
    }
}
