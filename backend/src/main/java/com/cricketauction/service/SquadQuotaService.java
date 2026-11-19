package com.cricketauction.service;

import com.cricketauction.dto.AuctionConstraintsResponse;
import com.cricketauction.dto.TeamBidConstraintDto;
import com.cricketauction.entity.Player;
import com.cricketauction.entity.Team;
import com.cricketauction.entity.Tournament;
import com.cricketauction.exception.AuctionException;
import com.cricketauction.repository.PlayerRepository;
import com.cricketauction.repository.TeamRepository;
import com.cricketauction.util.CategoryQuotaConfigUtil;
import com.cricketauction.util.CategoryQuotaConfigUtil.CategoryQuotaConfig;
import com.cricketauction.util.CategoryQuotaConfigUtil.CategoryRule;
import com.cricketauction.util.PlayerCategoryUtil;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class SquadQuotaService {

    private final PlayerRepository playerRepository;
    private final TeamRepository teamRepository;

    public SquadQuotaService(PlayerRepository playerRepository, TeamRepository teamRepository) {
        this.playerRepository = playerRepository;
        this.teamRepository = teamRepository;
    }

    public boolean hasActiveRules(Tournament tournament) {
        return isEnabled(tournament) && !config(tournament).categories.isEmpty();
    }

    public boolean isEnabled(Tournament tournament) {
        return tournament != null && Boolean.TRUE.equals(tournament.getCategoryQuotasEnabled());
    }

  public CategoryQuotaConfig config(Tournament tournament) {
        return CategoryQuotaConfigUtil.parse(tournament.getCategoryQuotasConfig());
    }

    public void validateAssignBid(Tournament tournament, Team team, Player currentPlayer, double bidAmount) {
        if (!isEnabled(tournament)) return;
        TeamBidConstraintDto c = evaluateTeam(tournament, team, currentPlayer, bidAmount, snapshot(tournament, currentPlayer));
        if (!c.isCanBid()) {
            throw new AuctionException(c.getReason() != null ? c.getReason()
                    : "Team cannot bid under category quota rules");
        }
    }

    @Transactional(readOnly = true)
    public AuctionConstraintsResponse constraintsForActiveLot(Tournament tournament, Player currentPlayer, double bidAmount) {
        if (!isEnabled(tournament) || currentPlayer == null) {
            return AuctionConstraintsResponse.builder()
                    .quotasEnabled(false)
                    .teams(List.of())
                    .build();
        }
        TournamentSnapshot snap = snapshot(tournament, currentPlayer);
        List<TeamBidConstraintDto> rows = teamRepository.findByTournamentId(tournament.getId()).stream()
                .map(team -> evaluateTeam(tournament, team, currentPlayer, bidAmount, snap))
                .toList();
        return AuctionConstraintsResponse.builder()
                .quotasEnabled(true)
                .playerCategory(currentPlayer.getPlayerCategory())
                .teams(rows)
                .build();
    }

    private TeamBidConstraintDto evaluateTeam(Tournament tournament, Team team, Player currentPlayer,
                                               double bidAmount, TournamentSnapshot snap) {
        CategoryQuotaConfig cfg = config(tournament);
        if (cfg.categories.isEmpty()) {
            return allow(team, bidAmount, "Quotas enabled but not configured");
        }

        String playerCat = currentPlayer.getPlayerCategory();
        if (playerCat == null || playerCat.isBlank()) {
            return deny(team, "Current player has no category set");
        }
        CategoryRule rule = findRule(cfg, playerCat);
        if (rule == null) {
            return deny(team, "No quota rule for category \"" + playerCat + "\"");
        }

        int squadSize = snap.squadSize(team.getId());
        int maxSquad = tournament.getMaxSquadSize() != null ? tournament.getMaxSquadSize() : 15;
        if (squadSize >= maxSquad) {
            return deny(team, "Squad full (" + maxSquad + ")");
        }

        Map<String, Integer> bought = snap.boughtByTeam.getOrDefault(team.getId(), Map.of());
        int haveCat = bought.getOrDefault(ruleKey(rule), 0);
        if (haveCat >= rule.maxOrLarge()) {
            return deny(team, "Already at max for " + label(rule));
        }

        Map<String, Integer> need = computeNeed(cfg, bought);
        int needThis = need.getOrDefault(ruleKey(rule), 0);

        if (cfg.strictMandatoryFirst) {
            int mandatoryLeft = need.values().stream().mapToInt(Integer::intValue).sum();
            if (mandatoryLeft > 0 && needThis <= 0) {
                return deny(team, "Must fill mandatory categories first");
            }
        }

        if (team.getRemainingBudget() < bidAmount) {
            return deny(team, "Insufficient budget");
        }

        double maxBid = computeMaxBid(team, cfg, need, snap, currentPlayer, rule);
        if (bidAmount > maxBid + 0.01) {
            return deny(team, "Max bid ₹" + (long) maxBid + " (reserve for mandatory picks)");
        }

        return TeamBidConstraintDto.builder()
                .teamId(team.getId())
                .canBid(true)
                .reason(null)
                .maxBid(maxBid)
                .build();
    }

    private TeamBidConstraintDto allow(Team team, double bidAmount, String note) {
        return TeamBidConstraintDto.builder()
                .teamId(team.getId())
                .canBid(team.getRemainingBudget() >= bidAmount)
                .reason(team.getRemainingBudget() >= bidAmount ? null : "Insufficient budget")
                .maxBid(team.getRemainingBudget())
                .build();
    }

    private TeamBidConstraintDto deny(Team team, String reason) {
        return TeamBidConstraintDto.builder()
                .teamId(team.getId())
                .canBid(false)
                .reason(reason)
                .maxBid(0.0)
                .build();
    }

    private double computeMaxBid(Team team, CategoryQuotaConfig cfg, Map<String, Integer> need,
                                TournamentSnapshot snap, Player currentPlayer, CategoryRule buyingRule) {
        Map<String, Integer> needAfter = new HashMap<>(need);
        String bk = ruleKey(buyingRule);
        if (needAfter.getOrDefault(bk, 0) > 0) {
            needAfter.put(bk, needAfter.get(bk) - 1);
        }
        double reserve = computeReserve(cfg, needAfter, snap.poolExcluding(currentPlayer.getId()));
        return Math.max(0, Math.floor(team.getRemainingBudget() - reserve));
    }

    private double computeReserve(CategoryQuotaConfig cfg, Map<String, Integer> need, List<Player> pool) {
        double total = 0;
        Map<String, List<Player>> byCat = pool.stream()
                .collect(Collectors.groupingBy(p -> ruleKey(findRule(cfg, p.getPlayerCategory()))));

        for (CategoryRule rule : cfg.categories) {
            String key = ruleKey(rule);
            int n = need.getOrDefault(key, 0);
            if (n <= 0) continue;
            List<Double> prices = byCat.getOrDefault(key, List.of()).stream()
                    .map(p -> p.getBasePrice() != null ? p.getBasePrice() : 0.0)
                    .sorted()
                    .toList();
            int take = Math.min(n, prices.size());
            for (int i = 0; i < take; i++) {
                total += prices.get(i);
            }
            int leftover = n - take;
            if (leftover > 0) {
                total += leftover * rule.reserveFloor();
            }
        }
        return total;
    }

    private Map<String, Integer> computeNeed(CategoryQuotaConfig cfg, Map<String, Integer> bought) {
        Map<String, Integer> need = new HashMap<>();
        for (CategoryRule rule : cfg.categories) {
            String key = ruleKey(rule);
            int have = bought.getOrDefault(key, 0);
            need.put(key, Math.max(0, rule.minOrZero() - have));
        }
        return need;
    }

    private CategoryRule findRule(CategoryQuotaConfig cfg, String playerCategory) {
        if (playerCategory == null) return null;
        for (CategoryRule rule : cfg.categories) {
            if (PlayerCategoryUtil.matchesRuleKey(playerCategory, rule.key)) return rule;
            if (rule.label != null && PlayerCategoryUtil.normalizeKey(playerCategory)
                    .equals(PlayerCategoryUtil.normalizeKey(rule.label))) {
                return rule;
            }
        }
        return null;
    }

    private String ruleKey(CategoryRule rule) {
        return PlayerCategoryUtil.normalizeKey(rule.key);
    }

    private String label(CategoryRule rule) {
        return rule.label != null && !rule.label.isBlank() ? rule.label : rule.key;
    }

    private TournamentSnapshot snapshot(Tournament tournament, Player currentPlayer) {
        List<Player> all = playerRepository.findByTournamentId(tournament.getId());
        Map<Long, Map<String, Integer>> boughtByTeam = new HashMap<>();
        List<Player> pool = new ArrayList<>();

        for (Player p : all) {
            if (p.getStatus() == Player.PlayerStatus.SOLD && p.getTeam() != null) {
                CategoryRule rule = findRule(config(tournament), p.getPlayerCategory());
                if (rule == null) continue;
                String key = ruleKey(rule);
                boughtByTeam
                        .computeIfAbsent(p.getTeam().getId(), id -> new HashMap<>())
                        .merge(key, 1, Integer::sum);
            }
            if (p.getStatus() == Player.PlayerStatus.AVAILABLE
                    || p.getStatus() == Player.PlayerStatus.UNSOLD
                    || (currentPlayer != null && p.getId().equals(currentPlayer.getId())
                    && p.getStatus() == Player.PlayerStatus.IN_AUCTION)) {
                if (findRule(config(tournament), p.getPlayerCategory()) != null) {
                    pool.add(p);
                }
            }
        }
        return new TournamentSnapshot(boughtByTeam, pool);
    }

    private record TournamentSnapshot(
            Map<Long, Map<String, Integer>> boughtByTeam,
            List<Player> pool
    ) {
        int squadSize(Long teamId) {
            return boughtByTeam.getOrDefault(teamId, Map.of()).values().stream().mapToInt(Integer::intValue).sum();
        }

        List<Player> poolExcluding(Long playerId) {
            return pool.stream().filter(p -> !p.getId().equals(playerId)).toList();
        }
    }
}