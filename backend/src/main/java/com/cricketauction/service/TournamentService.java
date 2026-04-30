package com.cricketauction.service;

import com.cricketauction.dto.TournamentRequest;
import com.cricketauction.dto.TournamentResponse;
import com.cricketauction.entity.Player;
import com.cricketauction.entity.Tournament;
import com.cricketauction.exception.ResourceNotFoundException;
import com.cricketauction.repository.TournamentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class TournamentService {

    private final TournamentRepository tournamentRepository;

    public TournamentService(TournamentRepository tournamentRepository) {
        this.tournamentRepository = tournamentRepository;
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
        Tournament tournament = findById(id);
        return mapToResponse(tournament);
    }

    public TournamentResponse updateTournament(Long id, TournamentRequest request) {
        Tournament tournament = findById(id);
        tournament.setName(request.getName());
        tournament.setDescription(request.getDescription());
        tournament = tournamentRepository.save(tournament);
        return mapToResponse(tournament);
    }

    public void deleteTournament(Long id) {
        Tournament tournament = findById(id);
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
