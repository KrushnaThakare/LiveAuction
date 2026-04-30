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

    @PostMapping("/start/{playerId}")
    public ResponseEntity<ApiResponse<AuctionStateResponse>> startAuction(
            @PathVariable Long tournamentId,
            @PathVariable Long playerId) {
        return ResponseEntity.ok(ApiResponse.success(
                "Auction started", auctionService.startAuction(tournamentId, playerId)));
    }

    @PostMapping("/bid")
    public ResponseEntity<ApiResponse<AuctionStateResponse>> placeBid(
            @PathVariable Long tournamentId,
            @Valid @RequestBody BidRequest bidRequest) {
        return ResponseEntity.ok(ApiResponse.success(
                "Bid placed successfully", auctionService.placeBid(tournamentId, bidRequest)));
    }

    @PostMapping("/sell")
    public ResponseEntity<ApiResponse<AuctionStateResponse>> sellPlayer(
            @PathVariable Long tournamentId) {
        return ResponseEntity.ok(ApiResponse.success(
                "Player sold successfully", auctionService.sellPlayer(tournamentId)));
    }

    @PostMapping("/unsold")
    public ResponseEntity<ApiResponse<AuctionStateResponse>> markUnsold(
            @PathVariable Long tournamentId) {
        return ResponseEntity.ok(ApiResponse.success(
                "Player marked as unsold", auctionService.markUnsold(tournamentId)));
    }

    @GetMapping("/history")
    public ResponseEntity<ApiResponse<List<AuctionStateResponse>>> getAuctionHistory(
            @PathVariable Long tournamentId) {
        return ResponseEntity.ok(ApiResponse.success(auctionService.getAuctionHistory(tournamentId)));
    }
}
