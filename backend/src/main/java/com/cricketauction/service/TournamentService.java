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

    private final TournamentRepository    tournamentRepository;
    private final AuctionSessionRepository auctionSessionRepository;

    public TournamentService(TournamentRepository tournamentRepository,
                             AuctionSessionRepository auctionSessionRepository) {
        this.tournamentRepository    = tournamentRepository;
        this.auctionSessionRepository = auctionSessionRepository;
    }

    public TournamentResponse createTournament(TournamentRequest request) {
        if (tournamentRepository.existsByName(request.getName())) {
            throw new IllegalArgumentException(
                    "Tournament with name '" + request.getName() + "' already exists");
        }
        Tournament tournament = Tournament.builder()
                .name(request.getName())
                .description(request.getDescription())
                .logoUrl(request.getLogoUrl())
                .build();
        return mapToResponse(tournamentRepository.save(tournament));
    }

    @Transactional(readOnly = true)
    public List<TournamentResponse> getAllTournaments() {
        return tournamentRepository.findAll().stream().map(this::mapToResponse).toList();
    }

    @Transactional(readOnly = true)
    public TournamentResponse getTournamentById(Long id) {
        return mapToResponse(findById(id));
    }

    public TournamentResponse updateTournament(Long id, TournamentRequest request) {
        Tournament t = findById(id);
        t.setName(request.getName());
        t.setDescription(request.getDescription());
        if (request.getLogoUrl() != null) t.setLogoUrl(request.getLogoUrl());
        return mapToResponse(tournamentRepository.save(t));
    }

    public void deleteTournament(Long id) {
        Tournament tournament = findById(id);

        /*
         * auction_sessions has FK columns current_player_id and
         * highest_bidder_team_id that point to players/teams.
         * Those FKs prevent JPA's cascade-delete from working.
         *
         * Fix: delete all auction sessions that belong to this tournament
         * explicitly, in one query, BEFORE the cascade on players/teams runs.
         */
        List<com.cricketauction.entity.AuctionSession> sessions =
                auctionSessionRepository.findByTournamentId(id);
        auctionSessionRepository.deleteAll(sessions);
        auctionSessionRepository.flush();   // flush so FK rows are gone before cascade

        tournamentRepository.delete(tournament);
    }

    public Tournament saveTournament(Tournament tournament) {
        return tournamentRepository.save(tournament);
    }

    public Tournament findById(Long id) {
        return tournamentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tournament", id));
    }

    private TournamentResponse mapToResponse(Tournament t) {
        long sold   = t.getPlayers().stream().filter(p -> p.getStatus() == Player.PlayerStatus.SOLD).count();
        long unsold = t.getPlayers().stream().filter(p -> p.getStatus() == Player.PlayerStatus.UNSOLD).count();
        return TournamentResponse.builder()
                .id(t.getId())
                .name(t.getName())
                .description(t.getDescription())
                .totalPlayers(t.getPlayers().size())
                .totalTeams(t.getTeams().size())
                .soldPlayers((int) sold)
                .unsoldPlayers((int) unsold)
                .createdAt(t.getCreatedAt())
                .logoUrl(t.getLogoUrl())
                .bannerUrl(t.getBannerUrl())
                .registrationEnabled(t.getRegistrationEnabled())
                .registrationMessage(t.getRegistrationMessage())
                .registrationRedirectLink(t.getRegistrationRedirectLink())
                .build();
    }
}
