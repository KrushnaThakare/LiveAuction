package com.cricketauction.service;

import com.cricketauction.dto.TeamRequest;
import com.cricketauction.dto.TeamResponse;
import com.cricketauction.entity.Team;
import com.cricketauction.entity.Tournament;
import com.cricketauction.exception.ResourceNotFoundException;
import com.cricketauction.repository.TeamRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class TeamService {

    private final TeamRepository teamRepository;
    private final TournamentService tournamentService;
    private final PlayerService playerService;

    public TeamService(TeamRepository teamRepository,
                       TournamentService tournamentService,
                       PlayerService playerService) {
        this.teamRepository = teamRepository;
        this.tournamentService = tournamentService;
        this.playerService = playerService;
    }

    public TeamResponse createTeam(Long tournamentId, TeamRequest request) {
        Tournament tournament = tournamentService.findById(tournamentId);

        if (teamRepository.existsByNameAndTournamentId(request.getName(), tournamentId)) {
            throw new IllegalArgumentException("Team '" + request.getName() + "' already exists in this tournament");
        }

        Team team = Team.builder()
                .name(request.getName())
                .logoUrl(request.getLogoUrl())
                .budget(request.getBudget())
                .remainingBudget(request.getBudget())
                .tournament(tournament)
                .build();

        team = teamRepository.save(team);
        return mapToResponse(team, false);
    }

    @Transactional(readOnly = true)
    public List<TeamResponse> getTeamsByTournament(Long tournamentId) {
        return teamRepository.findByTournamentId(tournamentId).stream()
                .map(t -> mapToResponse(t, true))
                .toList();
    }

    @Transactional(readOnly = true)
    public TeamResponse getTeamById(Long id) {
        Team team = findById(id);
        return mapToResponse(team, true);
    }

    public TeamResponse updateTeam(Long id, TeamRequest request) {
        Team team = findById(id);
        double budgetDiff = request.getBudget() - team.getBudget();
        team.setName(request.getName());
        team.setLogoUrl(request.getLogoUrl());
        team.setBudget(request.getBudget());
        team.setRemainingBudget(team.getRemainingBudget() + budgetDiff);
        team = teamRepository.save(team);
        return mapToResponse(team, false);
    }

    public void deleteTeam(Long id) {
        Team team = findById(id);
        teamRepository.delete(team);
    }

    public Team findById(Long id) {
        return teamRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Team", id));
    }

    private TeamResponse mapToResponse(Team team, boolean includePlayers) {
        var builder = TeamResponse.builder()
                .id(team.getId())
                .name(team.getName())
                .logoUrl(team.getLogoUrl())
                .budget(team.getBudget())
                .remainingBudget(team.getRemainingBudget())
                .playerCount(team.getPlayers().size())
                .tournamentId(team.getTournament().getId());

        if (includePlayers) {
            builder.players(team.getPlayers().stream()
                    .map(playerService::mapToResponse)
                    .toList());
        }

        return builder.build();
    }
}
