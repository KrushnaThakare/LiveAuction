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
import java.util.concurrent.ThreadLocalRandom;

@Service
@Transactional
public class AuctionService {

    private static final double BID_THRESHOLD    = 10000.0;
    private static final double BID_INC_LOW      = 1000.0;
    private static final double BID_INC_HIGH     = 2000.0;

    private final AuctionSessionRepository auctionSessionRepository;
    private final PlayerRepository         playerRepository;
    private final TeamRepository           teamRepository;
    private final TournamentService        tournamentService;
    private final PlayerService            playerService;

    public AuctionService(AuctionSessionRepository auctionSessionRepository,
                          PlayerRepository playerRepository,
                          TeamRepository teamRepository,
                          TournamentService tournamentService,
                          PlayerService playerService) {
        this.auctionSessionRepository = auctionSessionRepository;
        this.playerRepository         = playerRepository;
        this.teamRepository           = teamRepository;
        this.tournamentService        = tournamentService;
        this.playerService            = playerService;
    }

    /* ── start auction for a specific player ── */
    public AuctionStateResponse startAuction(Long tournamentId, Long playerId) {
        Tournament tournament = tournamentService.findById(tournamentId);
        ensureNoActiveSession(tournamentId);

        Player player = playerService.findById(playerId);
        validatePlayerForAuction(player, tournamentId);

        return createAndSaveSession(tournament, player);
    }

    /* ── pick a random AVAILABLE player and start auction ── */
    public AuctionStateResponse startRandomAuction(Long tournamentId) {
        Tournament tournament = tournamentService.findById(tournamentId);
        ensureNoActiveSession(tournamentId);

        List<Player> available = playerRepository.findByTournamentIdAndStatus(
                tournamentId, Player.PlayerStatus.AVAILABLE);

        if (available.isEmpty()) {
            // fall back to unsold players for re-auction round
            available = playerRepository.findByTournamentIdAndStatus(
                    tournamentId, Player.PlayerStatus.UNSOLD);
            if (available.isEmpty()) {
                throw new AuctionException("No available or unsold players left for this tournament");
            }
            // reset unsold → available so the auction can proceed
            for (Player p : available) {
                p.setStatus(Player.PlayerStatus.AVAILABLE);
                p.setCurrentBid(0.0);
            }
            playerRepository.saveAll(available);
        }

        int idx = ThreadLocalRandom.current().nextInt(available.size());
        Player player = available.get(idx);
        // reload in case we just updated status
        player = playerRepository.findById(player.getId()).orElseThrow();
        validatePlayerForAuction(player, tournamentId);

        return createAndSaveSession(tournament, player);
    }

    /* ── assign bid to a team at the proposed/custom amount ── */
    public AuctionStateResponse assignBid(Long tournamentId, BidRequest bidRequest) {
        AuctionSession session = requireActiveSession(tournamentId);
        Team team = teamRepository.findById(bidRequest.getTeamId())
                .orElseThrow(() -> new AuctionException("Team not found"));

        if (!team.getTournament().getId().equals(tournamentId)) {
            throw new AuctionException("Team does not belong to this tournament");
        }

        double currentBid = session.getCurrentBid();
        double newBid;

        if (bidRequest.getCustomBidAmount() != null) {
            newBid = bidRequest.getCustomBidAmount();
            if (newBid <= currentBid) {
                throw new AuctionException(
                        "Bid amount must be greater than current bid of " + (long) currentBid);
            }
        } else {
            // auto-increment only if no custom amount — host can always override with custom
            double step = currentBid < BID_THRESHOLD ? BID_INC_LOW : BID_INC_HIGH;
            newBid = currentBid + step;
        }

        if (team.getRemainingBudget() < newBid) {
            throw new AuctionException(
                    "Team '" + team.getName() + "' has insufficient budget (" +
                    team.getRemainingBudget().longValue() + " < " + (long) newBid + ")");
        }

        session.setCurrentBid(newBid);
        session.setHighestBidderTeam(team);
        session.getCurrentPlayer().setCurrentBid(newBid);
        playerRepository.save(session.getCurrentPlayer());
        session = auctionSessionRepository.save(session);
        return mapToResponse(session);
    }

    /* ── sell to highest bidder ── */
    public AuctionStateResponse sellPlayer(Long tournamentId) {
        AuctionSession session = requireActiveSession(tournamentId);
        if (session.getHighestBidderTeam() == null) {
            throw new AuctionException("No team has bid yet. Mark the player as Unsold instead.");
        }

        Player player    = session.getCurrentPlayer();
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

        // Null out FK columns before closing — prevents UNIQUE constraint violation
        // if this player is ever re-auctioned in a new session row.
        Player closedPlayer     = session.getCurrentPlayer();
        Team   closedWinnerTeam = session.getHighestBidderTeam();
        double closedBid        = session.getCurrentBid();

        session.setCurrentPlayer(null);
        session.setHighestBidderTeam(null);
        session.setStatus(AuctionSession.AuctionStatus.SOLD);
        session.setEndedAt(LocalDateTime.now());
        session = auctionSessionRepository.save(session);

        // Restore in-memory for the API response (DB already has NULLs)
        session.setCurrentPlayer(closedPlayer);
        session.setHighestBidderTeam(closedWinnerTeam);
        session.setCurrentBid(closedBid);
        return mapToResponse(session);
    }

    /* ── mark unsold ── */
    public AuctionStateResponse markUnsold(Long tournamentId) {
        AuctionSession session = requireActiveSession(tournamentId);
        Player player = session.getCurrentPlayer();
        player.setStatus(Player.PlayerStatus.UNSOLD);
        player.setCurrentBid(0.0);
        playerRepository.save(player);

        Player closedPlayer = session.getCurrentPlayer();
        session.setCurrentPlayer(null);   // null FK so re-auction session can reuse this player
        session.setHighestBidderTeam(null);
        session.setStatus(AuctionSession.AuctionStatus.UNSOLD);
        session.setEndedAt(LocalDateTime.now());
        session = auctionSessionRepository.save(session);
        session.setCurrentPlayer(closedPlayer);
        return mapToResponse(session);
    }

    /* ── stop / cancel active auction (player goes back to AVAILABLE) ── */
    public AuctionStateResponse stopAuction(Long tournamentId) {
        AuctionSession session = requireActiveSession(tournamentId);
        Player player = session.getCurrentPlayer();

        player.setStatus(Player.PlayerStatus.AVAILABLE);
        player.setCurrentBid(0.0);
        playerRepository.save(player);
        Player closedPlayer = session.getCurrentPlayer();

        session.setCurrentPlayer(null);   // null FK
        session.setHighestBidderTeam(null);
        session.setStatus(AuctionSession.AuctionStatus.UNSOLD);
        session.setCurrentBid(0.0);
        session.setEndedAt(LocalDateTime.now());
        session = auctionSessionRepository.save(session);
        session.setCurrentPlayer(closedPlayer);
        return mapToResponse(session);
    }

    /* ── re-auction all unsold players (reset to AVAILABLE) ── */
    public int reAuctionUnsold(Long tournamentId) {
        List<Player> unsold = playerRepository.findByTournamentIdAndStatus(
                tournamentId, Player.PlayerStatus.UNSOLD);
        if (unsold.isEmpty()) {
            throw new AuctionException("No unsold players to re-auction");
        }
        for (Player p : unsold) {
            p.setStatus(Player.PlayerStatus.AVAILABLE);
            p.setCurrentBid(0.0);
        }
        playerRepository.saveAll(unsold);
        return unsold.size();
    }

    /* ── get state ── */
    @Transactional(readOnly = true)
    public AuctionStateResponse getAuctionState(Long tournamentId) {
        Optional<AuctionSession> active = auctionSessionRepository
                .findByTournamentIdAndStatus(tournamentId, AuctionSession.AuctionStatus.ACTIVE);
        if (active.isPresent()) return mapToResponse(active.get());

        Optional<AuctionSession> last = auctionSessionRepository
                .findTopByTournamentIdOrderByIdDesc(tournamentId);
        return last.map(this::mapToResponse).orElse(
                AuctionStateResponse.builder()
                        .status(AuctionSession.AuctionStatus.IDLE)
                        .tournamentId(tournamentId)
                        .currentBid(0.0)
                        .build());
    }

    /* ── history ── */
    @Transactional(readOnly = true)
    public List<AuctionStateResponse> getAuctionHistory(Long tournamentId) {
        return auctionSessionRepository.findAll().stream()
                .filter(s -> s.getTournament().getId().equals(tournamentId))
                .map(this::mapToResponse)
                .toList();
    }

    /* ─── private helpers ─── */

    private AuctionSession requireActiveSession(Long tournamentId) {
        return auctionSessionRepository
                .findByTournamentIdAndStatus(tournamentId, AuctionSession.AuctionStatus.ACTIVE)
                .orElseThrow(() -> new AuctionException("No active auction session for this tournament"));
    }

    private void ensureNoActiveSession(Long tournamentId) {
        auctionSessionRepository
                .findByTournamentIdAndStatus(tournamentId, AuctionSession.AuctionStatus.ACTIVE)
                .ifPresent(s -> {
                    throw new AuctionException(
                            "An auction is already active. Please sell or mark as unsold first.");
                });
    }

    private void validatePlayerForAuction(Player player, Long tournamentId) {
        if (player.getStatus() != Player.PlayerStatus.AVAILABLE) {
            throw new AuctionException(
                    "Player '" + player.getName() + "' is not available for auction (status: " +
                    player.getStatus() + ")");
        }
        if (!player.getTournament().getId().equals(tournamentId)) {
            throw new AuctionException("Player does not belong to this tournament");
        }
    }

    private AuctionStateResponse createAndSaveSession(Tournament tournament, Player player) {
        // ── Critical: null out current_player_id on any old closed sessions ──────────────
        // Old sessions (created before the null-on-close fix) still reference this player.
        // The UNIQUE constraint on current_player_id fires when we try to insert a new row.
        // Nulling them here guarantees the insert will always succeed, regardless of the
        // state of the database index.
        auctionSessionRepository.nullifyPlayerFromClosedSessions(player.getId());

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
        return mapToResponse(auctionSessionRepository.save(session));
    }

    private AuctionStateResponse mapToResponse(AuctionSession session) {
        double current = session.getCurrentBid();
        // If nobody has bid yet, the first bid IS the base price (current bid).
        // Only add an increment after at least one bid has been placed.
        double next = (session.getHighestBidderTeam() == null)
                ? current
                : (current < BID_THRESHOLD ? current + BID_INC_LOW : current + BID_INC_HIGH);

        return AuctionStateResponse.builder()
                .sessionId(session.getId())
                .status(session.getStatus())
                .currentPlayer(session.getCurrentPlayer() != null
                        ? playerService.mapToResponse(session.getCurrentPlayer()) : null)
                .currentBid(current)
                .highestBidderTeamId(session.getHighestBidderTeam() != null
                        ? session.getHighestBidderTeam().getId() : null)
                .highestBidderTeamName(session.getHighestBidderTeam() != null
                        ? session.getHighestBidderTeam().getName() : null)
                .nextBidAmount(next)
                .tournamentId(session.getTournament().getId())
                .build();
    }
}
