package com.cricketauction.service;

import com.cricketauction.dto.TournamentRequest;
import com.cricketauction.dto.TournamentResponse;
import com.cricketauction.entity.Player;
import com.cricketauction.entity.Tournament;
import com.cricketauction.exception.ResourceNotFoundException;
import com.cricketauction.repository.AuctionSessionRepository;
import com.cricketauction.repository.BidRuleRepository;
import com.cricketauction.repository.FormFieldRepository;
import com.cricketauction.repository.FormSectionRepository;
import com.cricketauction.repository.PlayerRegistrationRepository;
import com.cricketauction.repository.PlayerRepository;
import com.cricketauction.repository.TeamRepository;
import com.cricketauction.repository.TournamentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class TournamentService {

    private final TournamentRepository    tournamentRepository;
    private final AuctionSessionRepository auctionSessionRepository;
    private final PlayerRegistrationRepository playerRegistrationRepository;
    private final BidRuleRepository bidRuleRepository;
    private final FormFieldRepository formFieldRepository;
    private final FormSectionRepository formSectionRepository;
    private final PlayerRepository playerRepository;
    private final TeamRepository teamRepository;
    private final AuditLogService auditLogService;

    public TournamentService(TournamentRepository tournamentRepository,
                             AuctionSessionRepository auctionSessionRepository,
                             PlayerRegistrationRepository playerRegistrationRepository,
                             BidRuleRepository bidRuleRepository,
                             FormFieldRepository formFieldRepository,
                             FormSectionRepository formSectionRepository,
                             PlayerRepository playerRepository,
                             TeamRepository teamRepository,
                             AuditLogService auditLogService) {
        this.tournamentRepository    = tournamentRepository;
        this.auctionSessionRepository = auctionSessionRepository;
        this.playerRegistrationRepository = playerRegistrationRepository;
        this.bidRuleRepository = bidRuleRepository;
        this.formFieldRepository = formFieldRepository;
        this.formSectionRepository = formSectionRepository;
        this.playerRepository = playerRepository;
        this.teamRepository = teamRepository;
        this.auditLogService = auditLogService;
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
         * Delete tournament-owned rows in FK-safe order. Relying only on
         * Tournament's cascade misses tables like bid_rules and registrations,
         * and auction_sessions also references players/teams.
         */
        auctionSessionRepository.deleteByTournamentId(id);
        playerRegistrationRepository.deleteByTournamentId(id);
        bidRuleRepository.deleteByTournamentId(id);
        formFieldRepository.deleteByTournamentId(id);
        formSectionRepository.deleteByTournamentId(id);
        playerRepository.deleteByTournamentId(id);
        teamRepository.deleteByTournamentId(id);

        tournamentRepository.flush();
        tournamentRepository.delete(tournament);
        auditLogService.record("TOURNAMENT_DELETED", "Tournament", id, id, tournament.getName());
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
