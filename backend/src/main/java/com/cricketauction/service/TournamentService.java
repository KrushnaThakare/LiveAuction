package com.cricketauction.service;

import com.cricketauction.dto.TournamentRequest;
import com.cricketauction.dto.TournamentResponse;
import com.cricketauction.entity.Player;
import com.cricketauction.entity.Tournament;
import com.cricketauction.exception.ResourceNotFoundException;
import com.cricketauction.repository.AuctionSessionRepository;
import com.cricketauction.repository.TournamentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class TournamentService {

    private final TournamentRepository tournamentRepository;
    private final AuctionSessionRepository auctionSessionRepository;

    public TournamentService(TournamentRepository tournamentRepository,
                             AuctionSessionRepository auctionSessionRepository) {
        this.tournamentRepository = tournamentRepository;
        this.auctionSessionRepository = auctionSessionRepository;
    }

    public TournamentResponse createTournament(TournamentRequest request) {
        if (tournamentRepository.existsByName(request.getName())) {
            throw new IllegalArgumentException("Tournament with name '" + request.getName() + "' already exists");
        }
        Tournament tournament = Tournament.builder()
                .name(request.getName())
                .description(request.getDescription())
                .build();
        tournament = tournamentRepository.save(tournament);
        return mapToResponse(tournament);
    }

    @Transactional(readOnly = true)
    public List<TournamentResponse> getAllTournaments() {
        return tournamentRepository.findAll().stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public TournamentResponse getTournamentById(Long id) {
        return mapToResponse(findById(id));
    }

    public TournamentResponse updateTournament(Long id, TournamentRequest request) {
        Tournament tournament = findById(id);
        tournament.setName(request.getName());
        tournament.setDescription(request.getDescription());
        return mapToResponse(tournamentRepository.save(tournament));
    }

    public void deleteTournament(Long id) {
        Tournament tournament = findById(id);
        // Null out FKs in auction_sessions that point to players/teams so
        // the subsequent cascade delete on players/teams can proceed.
        auctionSessionRepository.nullifyForeignKeysForTournament(id);
        tournamentRepository.delete(tournament);
    }

    public Tournament findById(Long id) {
        return tournamentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tournament", id));
    }

    private TournamentResponse mapToResponse(Tournament tournament) {
        long sold = tournament.getPlayers().stream()
                .filter(p -> p.getStatus() == Player.PlayerStatus.SOLD).count();
        long unsold = tournament.getPlayers().stream()
                .filter(p -> p.getStatus() == Player.PlayerStatus.UNSOLD).count();
        return TournamentResponse.builder()
                .id(tournament.getId())
                .name(tournament.getName())
                .description(tournament.getDescription())
                .totalPlayers(tournament.getPlayers().size())
                .totalTeams(tournament.getTeams().size())
                .soldPlayers((int) sold)
                .unsoldPlayers((int) unsold)
                .createdAt(tournament.getCreatedAt())
                .build();
    }
}
