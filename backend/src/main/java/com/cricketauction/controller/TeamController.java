package com.cricketauction.controller;

import com.cricketauction.dto.ApiResponse;
import com.cricketauction.dto.TeamRequest;
import com.cricketauction.dto.TeamResponse;
import com.cricketauction.entity.Team;
import com.cricketauction.repository.TeamRepository;
import com.cricketauction.service.FileStorageService;
import com.cricketauction.service.TeamService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/tournaments/{tournamentId}/teams")
public class TeamController {

    private final TeamService        teamService;
    private final FileStorageService fileStorage;
    private final TeamRepository     teamRepository;

    public TeamController(TeamService teamService,
                          FileStorageService fileStorage,
                          TeamRepository teamRepository) {
        this.teamService    = teamService;
        this.fileStorage    = fileStorage;
        this.teamRepository = teamRepository;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<TeamResponse>> createTeam(
            @PathVariable Long tournamentId,
            @Valid @RequestBody TeamRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Team created successfully",
                        teamService.createTeam(tournamentId, request)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<TeamResponse>>> getTeams(@PathVariable Long tournamentId) {
        return ResponseEntity.ok(ApiResponse.success(teamService.getTeamsByTournament(tournamentId)));
    }

    @GetMapping("/{teamId}")
    public ResponseEntity<ApiResponse<TeamResponse>> getTeamById(
            @PathVariable Long tournamentId, @PathVariable Long teamId) {
        return ResponseEntity.ok(ApiResponse.success(teamService.getTeamById(teamId)));
    }

    @PutMapping("/{teamId}")
    public ResponseEntity<ApiResponse<TeamResponse>> updateTeam(
            @PathVariable Long tournamentId, @PathVariable Long teamId,
            @Valid @RequestBody TeamRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Team updated",
                teamService.updateTeam(teamId, request)));
    }

    /** Upload / replace a team logo */
    @PostMapping("/{teamId}/logo")
    public ResponseEntity<ApiResponse<String>> uploadTeamLogo(
            @PathVariable Long tournamentId,
            @PathVariable Long teamId,
            @RequestParam("file") MultipartFile file) {
        try {
            String url = fileStorage.saveTournamentBanner(file); // reuses tournaments/ upload dir
            Team team = teamRepository.findById(teamId)
                    .orElseThrow(() -> new RuntimeException("Team not found"));
            team.setLogoUrl(url);
            teamRepository.save(team);
            return ResponseEntity.ok(ApiResponse.success("Logo uploaded", url));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @DeleteMapping("/{teamId}")
    public ResponseEntity<ApiResponse<Void>> deleteTeam(
            @PathVariable Long tournamentId, @PathVariable Long teamId) {
        teamService.deleteTeam(teamId);
        return ResponseEntity.ok(ApiResponse.success("Team deleted", null));
    }
}
