package com.cricketauction.service;

import com.cricketauction.dto.PlayerResponse;
import com.cricketauction.entity.Player;
import com.cricketauction.entity.Tournament;
import com.cricketauction.exception.ResourceNotFoundException;
import com.cricketauction.repository.PlayerRepository;
import com.cricketauction.util.ExcelParserUtil;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@Service
@Transactional
public class PlayerService {

    private final PlayerRepository playerRepository;
    private final TournamentService tournamentService;
    private final ExcelParserUtil excelParserUtil;

    public PlayerService(PlayerRepository playerRepository,
                         TournamentService tournamentService,
                         ExcelParserUtil excelParserUtil) {
        this.playerRepository = playerRepository;
        this.tournamentService = tournamentService;
        this.excelParserUtil = excelParserUtil;
    }

    public List<PlayerResponse> uploadPlayers(Long tournamentId, MultipartFile file) throws IOException {
        Tournament tournament = tournamentService.findById(tournamentId);
        List<Player> players = excelParserUtil.parsePlayersFromExcel(file, tournament);
        players = playerRepository.saveAll(players);
        return players.stream().map(this::mapToResponse).toList();
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

    public void deletePlayer(Long id) {
        Player player = findById(id);
        playerRepository.delete(player);
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
                .status(player.getStatus())
                .tournamentId(player.getTournament() != null ? player.getTournament().getId() : null)
                .teamId(player.getTeam() != null ? player.getTeam().getId() : null)
                .teamName(player.getTeam() != null ? player.getTeam().getName() : null)
                .build();
    }
}
