package com.cricketauction.service;

import com.cricketauction.dto.AuctionStateResponse;
import com.cricketauction.dto.BidRequest;
import com.cricketauction.entity.AuctionSession;
import com.cricketauction.entity.Player;
import com.cricketauction.entity.Team;
import com.cricketauction.entity.Tournament;
import com.cricketauction.exception.AuctionException;
import com.cricketauction.repository.AuctionSessionRepository;
import com.cricketauction.repository.PlayerRepository;
import com.cricketauction.repository.TeamRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class AuctionService {

    private static final double BID_INCREMENT_LOW = 1000.0;
    private static final double BID_INCREMENT_HIGH = 2000.0;
    private static final double BID_THRESHOLD = 10000.0;

    private final AuctionSessionRepository auctionSessionRepository;
    private final PlayerRepository playerRepository;
    private final TeamRepository teamRepository;
    private final TournamentService tournamentService;
    private final PlayerService playerService;

    public AuctionService(AuctionSessionRepository auctionSessionRepository,
                          PlayerRepository playerRepository,
                          TeamRepository teamRepository,
                          TournamentService tournamentService,
                          PlayerService playerService) {
        this.auctionSessionRepository = auctionSessionRepository;
        this.playerRepository = playerRepository;
        this.teamRepository = teamRepository;
        this.tournamentService = tournamentService;
        this.playerService = playerService;
    }

    public AuctionStateResponse startAuction(Long tournamentId, Long playerId) {
        Tournament tournament = tournamentService.findById(tournamentId);

        Optional<AuctionSession> activeSession = auctionSessionRepository
                .findByTournamentIdAndStatus(tournamentId, AuctionSession.AuctionStatus.ACTIVE);
        if (activeSession.isPresent()) {
            throw new AuctionException("An auction is already active for this tournament. Please sell or mark as unsold first.");
        }

        Player player = playerService.findById(playerId);
        if (player.getStatus() != Player.PlayerStatus.AVAILABLE) {
            throw new AuctionException("Player '" + player.getName() + "' is not available for auction");
        }
        if (!player.getTournament().getId().equals(tournamentId)) {
            throw new AuctionException("Player does not belong to this tournament");
        }

        player.setStatus(Player.PlayerStatus.IN_AUCTION);
        player.setCurrentBid(player.getBasePrice());
        playerRepository.save(player);

        AuctionSession session = AuctionSession.builder()
                .tournament(tournament)
                .currentPlayer(player)
                .currentBid(player.getBasePrice())
                .status(AuctionSession.AuctionStatus.ACTIVE)
                .startedAt(LocalDateTime.now())
                .build();

        session = auctionSessionRepository.save(session);
        return mapToResponse(session);
    }

    public AuctionStateResponse placeBid(Long tournamentId, BidRequest bidRequest) {
        AuctionSession session = getActiveSession(tournamentId);
        Team biddingTeam = teamRepository.findById(bidRequest.getTeamId())
                .orElseThrow(() -> new AuctionException("Team not found"));

        if (!biddingTeam.getTournament().getId().equals(tournamentId)) {
            throw new AuctionException("Team does not belong to this tournament");
        }

        double currentBid = session.getCurrentBid();
        double newBid;

        if (bidRequest.getCustomBidAmount() != null) {
            newBid = bidRequest.getCustomBidAmount();
            if (newBid <= currentBid) {
                throw new AuctionException("Custom bid must be greater than the current bid of " + currentBid);
            }
        } else {
            double increment = currentBid < BID_THRESHOLD ? BID_INCREMENT_LOW : BID_INCREMENT_HIGH;
            newBid = currentBid + increment;
        }

        if (biddingTeam.getRemainingBudget() < newBid) {
            throw new AuctionException("Team '" + biddingTeam.getName() + "' does not have sufficient budget for this bid");
        }

        session.setCurrentBid(newBid);
        session.setHighestBidderTeam(biddingTeam);
        session.getCurrentPlayer().setCurrentBid(newBid);

        playerRepository.save(session.getCurrentPlayer());
        session = auctionSessionRepository.save(session);
        return mapToResponse(session);
    }

    public AuctionStateResponse sellPlayer(Long tournamentId) {
        AuctionSession session = getActiveSession(tournamentId);

        if (session.getHighestBidderTeam() == null) {
            throw new AuctionException("No bid has been placed. Mark player as unsold instead.");
        }

        Player player = session.getCurrentPlayer();
        Team winningTeam = session.getHighestBidderTeam();

        if (winningTeam.getRemainingBudget() < session.getCurrentBid()) {
            throw new AuctionException("Winning team does not have sufficient budget");
        }

        winningTeam.setRemainingBudget(winningTeam.getRemainingBudget() - session.getCurrentBid());
        teamRepository.save(winningTeam);

        player.setStatus(Player.PlayerStatus.SOLD);
        player.setTeam(winningTeam);
        player.setCurrentBid(session.getCurrentBid());
        playerRepository.save(player);

        session.setStatus(AuctionSession.AuctionStatus.SOLD);
        session.setEndedAt(LocalDateTime.now());
        session = auctionSessionRepository.save(session);

        return mapToResponse(session);
    }

    public AuctionStateResponse markUnsold(Long tournamentId) {
        AuctionSession session = getActiveSession(tournamentId);
        Player player = session.getCurrentPlayer();

        player.setStatus(Player.PlayerStatus.UNSOLD);
        player.setCurrentBid(0.0);
        playerRepository.save(player);

        session.setStatus(AuctionSession.AuctionStatus.UNSOLD);
        session.setEndedAt(LocalDateTime.now());
        session = auctionSessionRepository.save(session);

        return mapToResponse(session);
    }

    @Transactional(readOnly = true)
    public AuctionStateResponse getAuctionState(Long tournamentId) {
        Optional<AuctionSession> activeSession = auctionSessionRepository
                .findByTournamentIdAndStatus(tournamentId, AuctionSession.AuctionStatus.ACTIVE);

        if (activeSession.isPresent()) {
            return mapToResponse(activeSession.get());
        }

        Optional<AuctionSession> lastSession = auctionSessionRepository
                .findTopByTournamentIdOrderByIdDesc(tournamentId);

        return lastSession.map(this::mapToResponse).orElse(
                AuctionStateResponse.builder()
                        .status(AuctionSession.AuctionStatus.IDLE)
                        .tournamentId(tournamentId)
                        .currentBid(0.0)
                        .build()
        );
    }

    @Transactional(readOnly = true)
    public List<AuctionStateResponse> getAuctionHistory(Long tournamentId) {
        return auctionSessionRepository.findAll().stream()
                .filter(s -> s.getTournament().getId().equals(tournamentId))
                .map(this::mapToResponse)
                .toList();
    }

    private AuctionSession getActiveSession(Long tournamentId) {
        return auctionSessionRepository
                .findByTournamentIdAndStatus(tournamentId, AuctionSession.AuctionStatus.ACTIVE)
                .orElseThrow(() -> new AuctionException("No active auction session for this tournament"));
    }

    private double calculateNextBid(double currentBid) {
        double increment = currentBid < BID_THRESHOLD ? BID_INCREMENT_LOW : BID_INCREMENT_HIGH;
        return currentBid + increment;
    }

    private AuctionStateResponse mapToResponse(AuctionSession session) {
        double nextBid = calculateNextBid(session.getCurrentBid());

        return AuctionStateResponse.builder()
                .sessionId(session.getId())
                .status(session.getStatus())
                .currentPlayer(session.getCurrentPlayer() != null
                        ? playerService.mapToResponse(session.getCurrentPlayer())
                        : null)
                .currentBid(session.getCurrentBid())
                .highestBidderTeamId(session.getHighestBidderTeam() != null
                        ? session.getHighestBidderTeam().getId()
                        : null)
                .highestBidderTeamName(session.getHighestBidderTeam() != null
                        ? session.getHighestBidderTeam().getName()
                        : null)
                .nextBidAmount(nextBid)
                .tournamentId(session.getTournament().getId())
                .build();
    }
}
