package com.cricketauction.controller;

import com.cricketauction.dto.ApiResponse;
import com.cricketauction.dto.TeamRequest;
import com.cricketauction.dto.TeamResponse;
import com.cricketauction.service.TeamService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tournaments/{tournamentId}/teams")
public class TeamController {

    private final TeamService teamService;

    public TeamController(TeamService teamService) {
        this.teamService = teamService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<TeamResponse>> createTeam(
            @PathVariable Long tournamentId,
            @Valid @RequestBody TeamRequest request) {
        TeamResponse team = teamService.createTeam(tournamentId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Team created successfully", team));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<TeamResponse>>> getTeams(@PathVariable Long tournamentId) {
        return ResponseEntity.ok(ApiResponse.success(teamService.getTeamsByTournament(tournamentId)));
    }

    @GetMapping("/{teamId}")
    public ResponseEntity<ApiResponse<TeamResponse>> getTeamById(
            @PathVariable Long tournamentId,
            @PathVariable Long teamId) {
        return ResponseEntity.ok(ApiResponse.success(teamService.getTeamById(teamId)));
    }

    @PutMapping("/{teamId}")
    public ResponseEntity<ApiResponse<TeamResponse>> updateTeam(
            @PathVariable Long tournamentId,
            @PathVariable Long teamId,
            @Valid @RequestBody TeamRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Team updated", teamService.updateTeam(teamId, request)));
    }

    @DeleteMapping("/{teamId}")
    public ResponseEntity<ApiResponse<Void>> deleteTeam(
            @PathVariable Long tournamentId,
            @PathVariable Long teamId) {
        teamService.deleteTeam(teamId);
        return ResponseEntity.ok(ApiResponse.success("Team deleted", null));
    }
}
