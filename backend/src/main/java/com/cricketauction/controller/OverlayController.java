package com.cricketauction.controller;

import com.cricketauction.dto.ApiResponse;
import com.cricketauction.dto.AuctionStateResponse;
import com.cricketauction.dto.TeamResponse;
import com.cricketauction.service.AuctionService;
import com.cricketauction.service.TeamService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/overlay")
public class OverlayController {
    private final AuctionService auctionService;
    private final TeamService teamService;

    public OverlayController(AuctionService auctionService, TeamService teamService) {
        this.auctionService = auctionService;
        this.teamService = teamService;
    }

    @GetMapping("/{tournamentId}/snapshot")
    public ResponseEntity<ApiResponse<Map<String, Object>>> snapshot(@PathVariable Long tournamentId) {
        AuctionStateResponse auction = auctionService.getAuctionState(tournamentId);
        List<TeamResponse> teams = teamService.getTeamsByTournament(tournamentId);
        return ResponseEntity.ok(ApiResponse.success(Map.of(
                "auction", auction,
                "teams", teams
        )));
    }
}
