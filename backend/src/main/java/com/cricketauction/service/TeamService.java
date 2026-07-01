package com.cricketauction.service;

import com.cricketauction.dto.TeamImportResult;
import com.cricketauction.dto.TeamRequest;
import com.cricketauction.dto.TeamResponse;
import com.cricketauction.entity.Team;
import com.cricketauction.entity.Tournament;
import com.cricketauction.exception.ResourceNotFoundException;
import com.cricketauction.repository.TeamRepository;
import com.cricketauction.repository.PlayerRepository;
import com.cricketauction.util.ExcelParserUtil;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Transactional
public class TeamService {

    private final TeamRepository teamRepository;
    private final TournamentService tournamentService;
    private final PlayerService playerService;
    private final PlayerRepository playerRepository;
    private final ExcelParserUtil excelParserUtil;

    public TeamService(TeamRepository teamRepository,
                       TournamentService tournamentService,
                       PlayerService playerService,
                       PlayerRepository playerRepository,
                       ExcelParserUtil excelParserUtil) {
        this.teamRepository = teamRepository;
        this.tournamentService = tournamentService;
        this.playerService = playerService;
        this.playerRepository = playerRepository;
        this.excelParserUtil = excelParserUtil;
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

    public TeamImportResult uploadTeams(Long tournamentId, MultipartFile file, Double defaultBudget) throws IOException {
        Tournament tournament = tournamentService.findById(tournamentId);
        double safeDefaultBudget = defaultBudget != null && defaultBudget > 0 ? defaultBudget : 100000.0;
        List<Team> parsed = excelParserUtil.parseTeamsFromExcel(file, tournament, safeDefaultBudget);
        if (parsed.isEmpty()) {
            return TeamImportResult.builder()
                    .imported(0)
                    .skipped(0)
                    .warnings(List.of("No valid team rows found in the spreadsheet"))
                    .teams(List.of())
                    .build();
        }

        Set<String> existingNames = teamRepository.findByTournamentId(tournamentId).stream()
                .map(team -> normalizeTeamName(team.getName()))
                .collect(Collectors.toSet());
        Set<String> seenInFile = new HashSet<>();
        List<Team> toSave = new ArrayList<>();
        List<String> warnings = new ArrayList<>();
        int skipped = 0;

        for (int i = 0; i < parsed.size(); i++) {
            Team candidate = parsed.get(i);
            String normalized = normalizeTeamName(candidate.getName());
            int rowNumber = i + 1;
            if (normalized.isBlank()) {
                skipped++;
                warnings.add("Row " + rowNumber + ": missing team name — skipped");
                continue;
            }
            if (!seenInFile.add(normalized)) {
                skipped++;
                warnings.add("Row " + rowNumber + ": duplicate name '" + candidate.getName() + "' in file — skipped");
                continue;
            }
            if (existingNames.contains(normalized)) {
                skipped++;
                warnings.add("Row " + rowNumber + ": team '" + candidate.getName() + "' already exists — skipped");
                continue;
            }
            toSave.add(candidate);
            existingNames.add(normalized);
        }

        if (toSave.isEmpty()) {
            return TeamImportResult.builder()
                    .imported(0)
                    .skipped(skipped)
                    .warnings(warnings)
                    .teams(List.of())
                    .build();
        }

        List<Team> saved = teamRepository.saveAll(toSave);
        List<TeamResponse> responses = saved.stream()
                .map(team -> mapToResponse(team, false))
                .toList();

        return TeamImportResult.builder()
                .imported(saved.size())
                .skipped(skipped)
                .warnings(warnings)
                .teams(responses)
                .build();
    }

    private static String normalizeTeamName(String name) {
        return name == null ? "" : name.trim().toLowerCase(Locale.ROOT);
    }

    @Transactional(readOnly = true)
    public List<TeamResponse> getTeamsByTournament(Long tournamentId) {
        return teamRepository.findByTournamentId(tournamentId).stream()
                .map(t -> mapToResponse(t, true))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TeamResponse> getTeamSummariesByTournament(Long tournamentId) {
        Map<Long, Integer> playerCounts = playerRepository.countPlayersByTeamForTournament(tournamentId)
                .stream()
                .collect(Collectors.toMap(
                        row -> (Long) row[0],
                        row -> ((Number) row[1]).intValue()));
        return teamRepository.findByTournamentId(tournamentId).stream()
                .map(team -> mapSummary(team, playerCounts.getOrDefault(team.getId(), 0)))
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

    private TeamResponse mapSummary(Team team, int playerCount) {
        return TeamResponse.builder()
                .id(team.getId())
                .name(team.getName())
                .logoUrl(team.getLogoUrl())
                .budget(team.getBudget())
                .remainingBudget(team.getRemainingBudget())
                .playerCount(playerCount)
                .tournamentId(team.getTournament().getId())
                .build();
    }
}
