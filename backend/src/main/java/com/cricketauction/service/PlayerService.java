package com.cricketauction.service;

import com.cricketauction.dto.PlayerRequest;
import com.cricketauction.dto.PlayerResponse;
import com.cricketauction.entity.Player;
import com.cricketauction.entity.Team;
import com.cricketauction.entity.Tournament;
import com.cricketauction.exception.AuctionException;
import com.cricketauction.exception.ResourceNotFoundException;
import com.cricketauction.repository.PlayerRepository;
import com.cricketauction.repository.TeamRepository;
import com.cricketauction.util.ExcelParserUtil;
import com.cricketauction.util.GoogleDriveUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
@Transactional
public class PlayerService {
    private static final Logger log = LoggerFactory.getLogger(PlayerService.class);
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final PlayerRepository  playerRepository;
    private final TournamentService tournamentService;
    private final TeamRepository    teamRepository;
    private final AuditLogService   auditLogService;
    private final ExcelParserUtil   excelParserUtil;
    private final GoogleDriveUtil   googleDriveUtil;
    private final CricHeroesStatsService cricHeroesStatsService;
    private final PlayerRoleService playerRoleService;

    public PlayerService(PlayerRepository playerRepository,
                         TournamentService tournamentService,
                         TeamRepository teamRepository,
                         AuditLogService auditLogService,
                         ExcelParserUtil excelParserUtil,
                         GoogleDriveUtil googleDriveUtil,
                         CricHeroesStatsService cricHeroesStatsService,
                         PlayerRoleService playerRoleService) {
        this.playerRepository  = playerRepository;
        this.tournamentService = tournamentService;
        this.teamRepository    = teamRepository;
        this.auditLogService   = auditLogService;
        this.excelParserUtil   = excelParserUtil;
        this.googleDriveUtil   = googleDriveUtil;
        this.cricHeroesStatsService = cricHeroesStatsService;
        this.playerRoleService = playerRoleService;
    }

    public List<PlayerResponse> uploadPlayers(Long tournamentId, MultipartFile file) throws IOException {
        Tournament tournament = tournamentService.findById(tournamentId);
        List<Player> players = excelParserUtil.parsePlayersFromExcel(file, tournament);
        players = playerRepository.saveAll(players);
        return players.stream().map(this::mapToResponse).toList();
    }

    public PlayerResponse createPlayer(Long tournamentId, PlayerRequest request) {
        Tournament tournament = tournamentService.findById(tournamentId);
        Player player = Player.builder()
                .name(request.getName())
                .role(playerRoleService.resolveRole(tournament, request.getRole()))
                .basePrice(request.getBasePrice())
                .currentBid(0.0)
                .imageUrl(request.getImageUrl() != null ? googleDriveUtil.convertToDirectLink(request.getImageUrl()) : null)
                .cricheroesProfileUrl(ExcelParserUtil.normalizeCricHeroesProfileUrl(request.getCricheroesProfileUrl()))
                .cricheroesPlayerId(ExcelParserUtil.extractCricHeroesPlayerId(request.getCricheroesProfileUrl()))
                .status(Player.PlayerStatus.AVAILABLE)
                .retained(Boolean.TRUE.equals(request.getRetained()))
                .tournament(tournament)
                .build();
        applyManualStats(player, request);
        applyRetainedAssignment(player, request.getTeamId());
        player = playerRepository.save(player);
        auditLogService.record("PLAYER_CREATED", "Player", player.getId(), tournamentId,
                player.getName() + (Boolean.TRUE.equals(player.getRetained()) ? " (retained)" : ""));
        return mapToResponse(player);
    }

    @Transactional(readOnly = true)
    public List<PlayerResponse> getPlayersByTournament(Long tournamentId) {
        return playerRepository.findByTournamentId(tournamentId).stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PlayerResponse> getPlayersByStatus(Long tournamentId, Player.PlayerStatus status) {
        return playerRepository.findByTournamentIdAndStatus(tournamentId, status).stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public PlayerResponse getPlayerById(Long id) {
        Player player = findById(id);
        return mapToResponse(player);
    }

    public PlayerResponse updatePlayer(Long id, com.cricketauction.dto.PlayerRequest request) {
        Player player = findById(id);
        Tournament tournament = player.getTournament();
        player.setName(request.getName());
        player.setRole(playerRoleService.resolveRole(tournament, request.getRole()));
        player.setBasePrice(request.getBasePrice());
        if (request.getImageUrl() != null) {
            player.setImageUrl(googleDriveUtil.convertToDirectLink(request.getImageUrl()));
        }
        player.setCricheroesProfileUrl(ExcelParserUtil.normalizeCricHeroesProfileUrl(request.getCricheroesProfileUrl()));
        player.setCricheroesPlayerId(ExcelParserUtil.extractCricHeroesPlayerId(request.getCricheroesProfileUrl()));
        applyManualStats(player, request);
        if (request.getRetained() != null) {
            clearRetainedBudget(player);
            player.setRetained(Boolean.TRUE.equals(request.getRetained()));
            applyRetainedAssignment(player, request.getTeamId());
        }
        player = playerRepository.save(player);
        auditLogService.record("PLAYER_UPDATED", "Player", player.getId(),
                player.getTournament() != null ? player.getTournament().getId() : null, player.getName());
        return mapToResponse(player);
    }

    public PlayerResponse fetchCricHeroesStats(Long playerId) {
        Player player = findById(playerId);
        try {
            cricHeroesStatsService.fetchAndApply(player);
            player = playerRepository.save(player);
            auditLogService.record("CRICHEROES_STATS_UPDATED", "Player", player.getId(),
                    player.getTournament() != null ? player.getTournament().getId() : null,
                    "Stats refreshed for Player #" + player.getId() + " " + player.getName());
            return mapToResponse(player);
        } catch (IOException e) {
            if (cricHeroesStatsService.isTimeout(e)) {
                log.warn("CricHeroes stats fetch timed out. playerId={} url={}", player.getId(), player.getCricheroesProfileUrl());
                throw new AuctionException("CricHeroes is not reachable from backend right now. Please retry later or fetch stats outside live auction.");
            }
            if (e instanceof CricHeroesStatsService.CricHeroesBlockedException) {
                log.warn("CricHeroes blocked backend stats fetch. playerId={} tournamentId={} url={}",
                        player.getId(),
                        player.getTournament() != null ? player.getTournament().getId() : null,
                        player.getCricheroesProfileUrl());
                throw new AuctionException(e.getMessage());
            }
            log.warn("CricHeroes stats fetch failed. playerId={} url={} error={}",
                    player.getId(), player.getCricheroesProfileUrl(), e.getMessage());
            throw new AuctionException("Failed to fetch CricHeroes stats: " + e.getMessage());
        } catch (IllegalStateException e) {
            throw new AuctionException("Failed to fetch CricHeroes stats: " + e.getMessage());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new AuctionException("CricHeroes stats fetch was interrupted");
        }
    }

    public int cleanInvalidCricHeroesProfiles(Long tournamentId) {
        List<Player> players = playerRepository.findByTournamentId(tournamentId);
        int cleaned = 0;
        for (Player player : players) {
            String normalized = ExcelParserUtil.normalizeCricHeroesProfileUrl(player.getCricheroesProfileUrl());
            Long normalizedId = ExcelParserUtil.extractCricHeroesPlayerId(normalized);
            boolean changed = (player.getCricheroesProfileUrl() != null && normalized == null)
                    || (normalized != null && !normalized.equals(player.getCricheroesProfileUrl()))
                    || (normalizedId != null && !normalizedId.equals(player.getCricheroesPlayerId()))
                    || (normalizedId == null && player.getCricheroesPlayerId() != null);
            if (changed) {
                player.setCricheroesProfileUrl(normalized);
                player.setCricheroesPlayerId(normalizedId);
                cleaned += 1;
            }
        }
        if (cleaned > 0) {
            playerRepository.saveAll(players);
            auditLogService.record("CRICHEROES_URLS_CLEANED", "Tournament", tournamentId, tournamentId,
                    "Cleaned invalid CricHeroes profile URLs for " + cleaned + " player(s)");
        }
        return cleaned;
    }


    public void deletePlayer(Long id) {
        Player player = findById(id);
        String name = player.getName();
        Long tournamentId = player.getTournament() != null ? player.getTournament().getId() : null;
        clearRetainedBudget(player);
        playerRepository.delete(player);
        auditLogService.record("PLAYER_DELETED", "Player", id, tournamentId, name);
    }

    public Player findById(Long id) {
        return playerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Player", id));
    }

    public PlayerResponse mapToResponse(Player player) {
        return PlayerResponse.builder()
                .id(player.getId())
                .name(player.getName())
                .role(player.getRole())
                .basePrice(player.getBasePrice())
                .currentBid(player.getCurrentBid())
                .imageUrl(player.getImageUrl())
                .cricheroesProfileUrl(player.getCricheroesProfileUrl())
                .cricheroesPlayerId(player.getCricheroesPlayerId())
                .statsMatches(player.getStatsMatches())
                .statsRuns(player.getStatsRuns())
                .statsStrikeRate(player.getStatsStrikeRate())
                .statsWickets(player.getStatsWickets())
                .statsEconomy(player.getStatsEconomy())
                .statsAverage(player.getStatsAverage())
                .statsLastUpdatedAt(player.getStatsLastUpdatedAt() != null ? player.getStatsLastUpdatedAt().toString() : null)
                .retained(Boolean.TRUE.equals(player.getRetained()))
                .status(player.getStatus())
                .tournamentId(player.getTournament() != null ? player.getTournament().getId() : null)
                .teamId(player.getTeam() != null ? player.getTeam().getId() : null)
                .teamName(player.getTeam() != null ? player.getTeam().getName() : null)
                .extraData(parseExtraData(player.getExtraData()))
                .build();
    }

    private Map<String, String> parseExtraData(String raw) {
        if (raw == null || raw.isBlank()) return Map.of();
        try {
            Map<String, String> parsed = OBJECT_MAPPER.readValue(raw, new TypeReference<LinkedHashMap<String, String>>() {});
            return parsed != null ? parsed : Map.of();
        } catch (Exception e) {
            log.warn("Could not parse player extraData JSON");
            return Map.of();
        }
    }

    private void applyRetainedAssignment(Player player, Long teamId) {
        if (!Boolean.TRUE.equals(player.getRetained())) return;
        if (teamId == null) {
            player.setTeam(null);
            player.setStatus(Player.PlayerStatus.AVAILABLE);
            player.setCurrentBid(0.0);
            return;
        }
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team", teamId));
        if (!team.getTournament().getId().equals(player.getTournament().getId())) {
            throw new IllegalArgumentException("Selected retained team does not belong to this tournament");
        }
        double amount = player.getBasePrice() == null ? 0.0 : player.getBasePrice();
        if (team.getRemainingBudget() < amount) {
            throw new IllegalArgumentException("Team '" + team.getName() + "' does not have enough remaining budget");
        }
        team.setRemainingBudget(team.getRemainingBudget() - amount);
        teamRepository.save(team);
        player.setTeam(team);
        player.setStatus(Player.PlayerStatus.SOLD);
        player.setCurrentBid(amount);
    }

    private void clearRetainedBudget(Player player) {
        if (!Boolean.TRUE.equals(player.getRetained()) || player.getTeam() == null) return;
        Team team = player.getTeam();
        team.setRemainingBudget(team.getRemainingBudget() + (player.getCurrentBid() == null ? 0.0 : player.getCurrentBid()));
        teamRepository.save(team);
        player.setTeam(null);
        player.setStatus(Player.PlayerStatus.AVAILABLE);
        player.setCurrentBid(0.0);
    }

    private void applyManualStats(Player player, PlayerRequest request) {
        boolean changed = false;
        if (request.getStatsMatches() != null) {
            player.setStatsMatches(request.getStatsMatches());
            changed = true;
        }
        if (request.getStatsRuns() != null) {
            player.setStatsRuns(request.getStatsRuns());
            changed = true;
        }
        if (request.getStatsStrikeRate() != null) {
            player.setStatsStrikeRate(request.getStatsStrikeRate());
            changed = true;
        }
        if (request.getStatsWickets() != null) {
            player.setStatsWickets(request.getStatsWickets());
            changed = true;
        }
        if (request.getStatsEconomy() != null) {
            player.setStatsEconomy(request.getStatsEconomy());
            changed = true;
        }
        if (request.getStatsAverage() != null) {
            player.setStatsAverage(request.getStatsAverage());
            changed = true;
        }
        if (changed) {
            player.setStatsLastUpdatedAt(LocalDateTime.now());
        }
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
