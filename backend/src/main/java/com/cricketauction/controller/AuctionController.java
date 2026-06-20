package com.cricketauction.controller;

import com.cricketauction.dto.ApiResponse;
import com.cricketauction.dto.AuctionStateResponse;
import com.cricketauction.dto.BidAmountRequest;
import com.cricketauction.dto.BidRequest;
import com.cricketauction.service.AuctionService;
import com.cricketauction.service.OverlayPushService;
import com.cricketauction.service.WhatsAppNotifyService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tournaments/{tournamentId}/auction")
public class AuctionController {

    private final AuctionService auctionService;
    private final OverlayPushService overlayPushService;
    private final WhatsAppNotifyService whatsAppNotifyService;

    public AuctionController(AuctionService auctionService,
                             OverlayPushService overlayPushService,
                             WhatsAppNotifyService whatsAppNotifyService) {
        this.auctionService = auctionService;
        this.overlayPushService = overlayPushService;
        this.whatsAppNotifyService = whatsAppNotifyService;
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
        overlayPushService.pushLightweightSnapshot(tournamentId, r);
        return ResponseEntity.ok(ApiResponse.success("Auction started", r));
    }

    /** Pick a random available player and start their auction */
    @PostMapping("/start-random")
    public ResponseEntity<ApiResponse<AuctionStateResponse>> startRandomAuction(
            @PathVariable Long tournamentId) {
        var r = auctionService.startRandomAuction(tournamentId);
        overlayPushService.pushLightweightSnapshot(tournamentId, r);
        return ResponseEntity.ok(ApiResponse.success("Random auction started", r));
    }

    /**
     * Assign the visible bid amount to a team.
     * Send { teamId, customBidAmount } — if customBidAmount is null the backend
     * keeps the current bid amount and only changes the bidder.
     */
    @PostMapping("/bid")
    public ResponseEntity<ApiResponse<AuctionStateResponse>> assignBid(
            @PathVariable Long tournamentId,
            @Valid @RequestBody BidRequest bidRequest) {
        var r = auctionService.assignBid(tournamentId, bidRequest);
        overlayPushService.pushLightweightSnapshot(tournamentId, r);
        return ResponseEntity.ok(ApiResponse.success("Bid assigned", r));
    }

    /** Update the visible calling bid without selecting/changing the bidding team. */
    @PostMapping("/calling-bid")
    public ResponseEntity<ApiResponse<AuctionStateResponse>> updateCallingBid(
            @PathVariable Long tournamentId,
            @Valid @RequestBody BidAmountRequest request) {
        var r = auctionService.updateCallingBid(tournamentId, request);
        overlayPushService.pushLightweightSnapshot(tournamentId, r);
        return ResponseEntity.ok(ApiResponse.success("Calling bid updated", r));
    }

    /** Sell to highest bidder, deduct budget */
    @PostMapping("/sell")
    public ResponseEntity<ApiResponse<AuctionStateResponse>> sellPlayer(
            @PathVariable Long tournamentId) {
        var r = auctionService.sellPlayer(tournamentId);
        overlayPushService.pushSnapshot(tournamentId, r);
        if (r.getCurrentPlayer() != null && r.getCurrentPlayer().getId() != null) {
            whatsAppNotifyService.notifyPlayerSoldAsync(tournamentId, r.getCurrentPlayer().getId());
        }
        return ResponseEntity.ok(ApiResponse.success("Player sold", r));
    }

    /** Mark current player as unsold */
    @PostMapping("/unsold")
    public ResponseEntity<ApiResponse<AuctionStateResponse>> markUnsold(
            @PathVariable Long tournamentId) {
        var r = auctionService.markUnsold(tournamentId);
        overlayPushService.pushLightweightSnapshot(tournamentId, r);
        return ResponseEntity.ok(ApiResponse.success("Player marked unsold", r));
    }

    /** Stop / cancel the active auction — player goes back to AVAILABLE */
    @PostMapping("/stop")
    public ResponseEntity<ApiResponse<AuctionStateResponse>> stopAuction(
            @PathVariable Long tournamentId) {
        var r = auctionService.stopAuction(tournamentId);
        overlayPushService.pushLightweightSnapshot(tournamentId, r);
        return ResponseEntity.ok(ApiResponse.success("Auction stopped", r));
    }

    /** Undo the last SOLD or UNSOLD decision */
    @PostMapping("/undo")
    public ResponseEntity<ApiResponse<AuctionStateResponse>> undoLastDecision(
            @PathVariable Long tournamentId) {
        var r = auctionService.undoLastDecision(tournamentId);
        overlayPushService.pushSnapshot(tournamentId, r);
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
