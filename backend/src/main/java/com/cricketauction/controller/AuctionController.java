package com.cricketauction.controller;

import com.cricketauction.dto.ApiResponse;
import com.cricketauction.dto.AuctionStateResponse;
import com.cricketauction.dto.BidRequest;
import com.cricketauction.service.AuctionService;
import com.cricketauction.service.OverlayPushService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tournaments/{tournamentId}/auction")
public class AuctionController {

    private final AuctionService auctionService;
    private final OverlayPushService overlayPushService;

    public AuctionController(AuctionService auctionService, OverlayPushService overlayPushService) {
        this.auctionService = auctionService;
        this.overlayPushService = overlayPushService;
    }

    @GetMapping("/state")
    public ResponseEntity<ApiResponse<AuctionStateResponse>> getAuctionState(
            @PathVariable Long tournamentId) {
        return ResponseEntity.ok(ApiResponse.success(auctionService.getAuctionState(tournamentId)));
    }

    /** Start auction for a specific player */
    @PostMapping("/start/{playerId}")
    public ResponseEntity<ApiResponse<AuctionStateResponse>> startAuction(
            @PathVariable Long tournamentId,
            @PathVariable Long playerId) {
        var r = auctionService.startAuction(tournamentId, playerId);
        overlayPushService.pushSnapshot(tournamentId);
        return ResponseEntity.ok(ApiResponse.success("Auction started", r));
    }

    /** Pick a random available player and start their auction */
    @PostMapping("/start-random")
    public ResponseEntity<ApiResponse<AuctionStateResponse>> startRandomAuction(
            @PathVariable Long tournamentId) {
        var r = auctionService.startRandomAuction(tournamentId);
        overlayPushService.pushSnapshot(tournamentId);
        return ResponseEntity.ok(ApiResponse.success("Random auction started", r));
    }

    /**
     * Assign the current bid to a team.
     * Send { teamId, customBidAmount } — if customBidAmount is null the backend
     * recalculates and applies the active tournament bid slab.
     */
    @PostMapping("/bid")
    public ResponseEntity<ApiResponse<AuctionStateResponse>> assignBid(
            @PathVariable Long tournamentId,
            @Valid @RequestBody BidRequest bidRequest) {
        var r = auctionService.assignBid(tournamentId, bidRequest);
        overlayPushService.pushSnapshot(tournamentId);
        return ResponseEntity.ok(ApiResponse.success("Bid assigned", r));
    }

    /** Sell to highest bidder, deduct budget */
    @PostMapping("/sell")
    public ResponseEntity<ApiResponse<AuctionStateResponse>> sellPlayer(
            @PathVariable Long tournamentId) {
        var r = auctionService.sellPlayer(tournamentId);
        overlayPushService.pushSnapshot(tournamentId);
        return ResponseEntity.ok(ApiResponse.success("Player sold", r));
    }

    /** Mark current player as unsold */
    @PostMapping("/unsold")
    public ResponseEntity<ApiResponse<AuctionStateResponse>> markUnsold(
            @PathVariable Long tournamentId) {
        var r = auctionService.markUnsold(tournamentId);
        overlayPushService.pushSnapshot(tournamentId);
        return ResponseEntity.ok(ApiResponse.success("Player marked unsold", r));
    }

    /** Stop / cancel the active auction — player goes back to AVAILABLE */
    @PostMapping("/stop")
    public ResponseEntity<ApiResponse<AuctionStateResponse>> stopAuction(
            @PathVariable Long tournamentId) {
        var r = auctionService.stopAuction(tournamentId);
        overlayPushService.pushSnapshot(tournamentId);
        return ResponseEntity.ok(ApiResponse.success("Auction stopped", r));
    }

    /** Undo the last SOLD or UNSOLD decision */
    @PostMapping("/undo")
    public ResponseEntity<ApiResponse<AuctionStateResponse>> undoLastDecision(
            @PathVariable Long tournamentId) {
        var r = auctionService.undoLastDecision(tournamentId);
        overlayPushService.pushSnapshot(tournamentId);
        return ResponseEntity.ok(ApiResponse.success("Decision reversed", r));
    }

    /** Reset all UNSOLD players to AVAILABLE for a second-round auction */
    @PostMapping("/re-auction-unsold")
    public ResponseEntity<ApiResponse<Integer>> reAuctionUnsold(
            @PathVariable Long tournamentId) {
        int count = auctionService.reAuctionUnsold(tournamentId);
        overlayPushService.pushSnapshot(tournamentId);
        return ResponseEntity.ok(ApiResponse.success(
                count + " unsold players reset to available", count));
    }

    @GetMapping("/history")
    public ResponseEntity<ApiResponse<List<AuctionStateResponse>>> getAuctionHistory(
            @PathVariable Long tournamentId) {
        return ResponseEntity.ok(ApiResponse.success(auctionService.getAuctionHistory(tournamentId)));
    }
}
