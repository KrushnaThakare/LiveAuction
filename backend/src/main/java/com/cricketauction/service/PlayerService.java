package com.cricketauction.service;

import com.cricketauction.dto.PlayerRequest;
import com.cricketauction.dto.PlayerResponse;
import com.cricketauction.entity.Player;
import com.cricketauction.entity.Team;
import com.cricketauction.entity.Tournament;
import com.cricketauction.exception.ResourceNotFoundException;
import com.cricketauction.repository.PlayerRepository;
import com.cricketauction.repository.TeamRepository;
import com.cricketauction.util.ExcelParserUtil;
import com.cricketauction.util.GoogleDriveUtil;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@Service
@Transactional
public class PlayerService {

    private final PlayerRepository  playerRepository;
    private final TournamentService tournamentService;
    private final TeamRepository    teamRepository;
    private final AuditLogService   auditLogService;
    private final ExcelParserUtil   excelParserUtil;
    private final GoogleDriveUtil   googleDriveUtil;

    public PlayerService(PlayerRepository playerRepository,
                         TournamentService tournamentService,
                         TeamRepository teamRepository,
                         AuditLogService auditLogService,
                         ExcelParserUtil excelParserUtil,
                         GoogleDriveUtil googleDriveUtil) {
        this.playerRepository  = playerRepository;
        this.tournamentService = tournamentService;
        this.teamRepository    = teamRepository;
        this.auditLogService   = auditLogService;
        this.excelParserUtil   = excelParserUtil;
        this.googleDriveUtil   = googleDriveUtil;
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
                .role(request.getRole())
                .basePrice(request.getBasePrice())
                .currentBid(0.0)
                .imageUrl(request.getImageUrl() != null ? googleDriveUtil.convertToDirectLink(request.getImageUrl()) : null)
                .status(Player.PlayerStatus.AVAILABLE)
                .retained(Boolean.TRUE.equals(request.getRetained()))
                .tournament(tournament)
                .build();
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
        player.setName(request.getName());
        player.setRole(request.getRole());
        player.setBasePrice(request.getBasePrice());
        if (request.getImageUrl() != null) {
            player.setImageUrl(googleDriveUtil.convertToDirectLink(request.getImageUrl()));
        }
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
                .retained(Boolean.TRUE.equals(player.getRetained()))
                .status(player.getStatus())
                .tournamentId(player.getTournament() != null ? player.getTournament().getId() : null)
                .teamId(player.getTeam() != null ? player.getTeam().getId() : null)
                .teamName(player.getTeam() != null ? player.getTeam().getName() : null)
                .build();
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
}
