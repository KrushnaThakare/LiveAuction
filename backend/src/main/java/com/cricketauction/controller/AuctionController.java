package com.cricketauction.controller;

import com.cricketauction.dto.ApiResponse;
import com.cricketauction.dto.AuctionStateResponse;
import com.cricketauction.dto.BidRequest;
import com.cricketauction.service.AuctionService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tournaments/{tournamentId}/auction")
public class AuctionController {

    private final AuctionService auctionService;

    public AuctionController(AuctionService auctionService) {
        this.auctionService = auctionService;
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
        return ResponseEntity.ok(ApiResponse.success(
                "Auction started", auctionService.startAuction(tournamentId, playerId)));
    }

    /** Pick a random available player and start their auction */
    @PostMapping("/start-random")
    public ResponseEntity<ApiResponse<AuctionStateResponse>> startRandomAuction(
            @PathVariable Long tournamentId) {
        return ResponseEntity.ok(ApiResponse.success(
                "Random auction started", auctionService.startRandomAuction(tournamentId)));
    }

    /**
     * Assign the current bid to a team.
     * Send { teamId, customBidAmount } — if customBidAmount is null the backend
     * applies the standard auto-increment rule.
     */
    @PostMapping("/bid")
    public ResponseEntity<ApiResponse<AuctionStateResponse>> assignBid(
            @PathVariable Long tournamentId,
            @Valid @RequestBody BidRequest bidRequest) {
        return ResponseEntity.ok(ApiResponse.success(
                "Bid assigned", auctionService.assignBid(tournamentId, bidRequest)));
    }

    /** Sell to highest bidder, deduct budget */
    @PostMapping("/sell")
    public ResponseEntity<ApiResponse<AuctionStateResponse>> sellPlayer(
            @PathVariable Long tournamentId) {
        return ResponseEntity.ok(ApiResponse.success(
                "Player sold", auctionService.sellPlayer(tournamentId)));
    }

    /** Mark current player as unsold */
    @PostMapping("/unsold")
    public ResponseEntity<ApiResponse<AuctionStateResponse>> markUnsold(
            @PathVariable Long tournamentId) {
        return ResponseEntity.ok(ApiResponse.success(
                "Player marked unsold", auctionService.markUnsold(tournamentId)));
    }

    /** Stop / cancel the active auction — player goes back to AVAILABLE */
    @PostMapping("/stop")
    public ResponseEntity<ApiResponse<AuctionStateResponse>> stopAuction(
            @PathVariable Long tournamentId) {
        return ResponseEntity.ok(ApiResponse.success(
                "Auction stopped", auctionService.stopAuction(tournamentId)));
    }

    /** Reset all UNSOLD players to AVAILABLE for a second-round auction */
    @PostMapping("/re-auction-unsold")
    public ResponseEntity<ApiResponse<Integer>> reAuctionUnsold(
            @PathVariable Long tournamentId) {
        int count = auctionService.reAuctionUnsold(tournamentId);
        return ResponseEntity.ok(ApiResponse.success(
                count + " unsold players reset to available", count));
    }

    @GetMapping("/history")
    public ResponseEntity<ApiResponse<List<AuctionStateResponse>>> getAuctionHistory(
            @PathVariable Long tournamentId) {
        return ResponseEntity.ok(ApiResponse.success(auctionService.getAuctionHistory(tournamentId)));
    }
}
