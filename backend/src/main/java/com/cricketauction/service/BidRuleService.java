package com.cricketauction.service;

import com.cricketauction.dto.BidRuleDto;
import com.cricketauction.entity.BidRule;
import com.cricketauction.entity.Tournament;
import com.cricketauction.exception.AuctionException;
import com.cricketauction.repository.BidRuleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

@Service
@Transactional
public class BidRuleService {
    private final BidRuleRepository bidRuleRepository;
    private final TournamentService tournamentService;

    public BidRuleService(BidRuleRepository bidRuleRepository, TournamentService tournamentService) {
        this.bidRuleRepository = bidRuleRepository;
        this.tournamentService = tournamentService;
    }

    @Transactional(readOnly = true)
    public List<BidRuleDto> getRules(Long tournamentId) {
        List<BidRule> rules = bidRuleRepository.findByTournamentIdOrderByPositionAscMinAmountAsc(tournamentId);
        if (rules.isEmpty()) return defaultRules().stream().map(this::map).toList();
        return rules.stream().map(this::map).toList();
    }

    public List<BidRuleDto> replaceRules(Long tournamentId, List<BidRuleDto> request) {
        if (request == null || request.isEmpty()) throw new AuctionException("At least one bid rule is required");
        Tournament tournament = tournamentService.findById(tournamentId);
        List<BidRuleDto> sorted = request.stream()
                .sorted(Comparator.comparing(BidRuleDto::getMinAmount))
                .toList();
        validate(sorted);
        bidRuleRepository.deleteByTournamentId(tournamentId);
        for (int i = 0; i < sorted.size(); i++) {
            BidRuleDto dto = sorted.get(i);
            bidRuleRepository.save(BidRule.builder()
                    .tournament(tournament)
                    .minAmount(dto.getMinAmount())
                    .maxAmount(dto.getMaxAmount())
                    .incrementAmount(dto.getIncrementAmount())
                    .position(i)
                    .build());
        }
        return getRules(tournamentId);
    }

    @Transactional(readOnly = true)
    public double getIncrement(Long tournamentId, double currentBid) {
        List<BidRule> rules = bidRuleRepository.findByTournamentIdOrderByPositionAscMinAmountAsc(tournamentId);
        if (rules.isEmpty()) rules = defaultRules();
        return rules.stream()
                .filter(r -> currentBid < r.getMaxAmount())
                .findFirst()
                .orElse(rules.get(rules.size() - 1))
                .getIncrementAmount();
    }

    private void validate(List<BidRuleDto> rules) {
        double expectedMin = 0.0;
        for (BidRuleDto rule : rules) {
            if (rule.getMinAmount() == null || rule.getMaxAmount() == null || rule.getIncrementAmount() == null) {
                throw new AuctionException("All bid rule fields are required");
            }
            if (rule.getMinAmount() < 0 || rule.getMaxAmount() < rule.getMinAmount() || rule.getIncrementAmount() <= 0) {
                throw new AuctionException("Invalid bid rule range or increment");
            }
            if (Math.abs(rule.getMinAmount() - expectedMin) > 1.0) {
                throw new AuctionException("Bid rules must not have gaps or overlaps. Expected minimum: " + (long) expectedMin);
            }
            expectedMin = rule.getMaxAmount() + 1.0;
        }
    }

    private List<BidRule> defaultRules() {
        Tournament t = Tournament.builder().id(0L).build();
        return List.of(
                BidRule.builder().tournament(t).minAmount(0.0).maxAmount(10000.0).incrementAmount(1000.0).position(0).build(),
                BidRule.builder().tournament(t).minAmount(10001.0).maxAmount(50000.0).incrementAmount(2000.0).position(1).build(),
                BidRule.builder().tournament(t).minAmount(50001.0).maxAmount(999999999.0).incrementAmount(5000.0).position(2).build()
        );
    }

    private BidRuleDto map(BidRule rule) {
        return BidRuleDto.builder()
                .id(rule.getId())
                .minAmount(rule.getMinAmount())
                .maxAmount(rule.getMaxAmount())
                .incrementAmount(rule.getIncrementAmount())
                .position(rule.getPosition())
                .build();
    }
}
