package com.cricketauction.service;

import com.cricketauction.entity.BidRule;
import com.cricketauction.entity.Tournament;
import com.cricketauction.repository.BidRuleRepository;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class BidRuleServiceTest {

    private final BidRuleRepository bidRuleRepository = mock(BidRuleRepository.class);
    private final TournamentService tournamentService = mock(TournamentService.class);
    private final BidRuleService bidRuleService = new BidRuleService(bidRuleRepository, tournamentService);

    @Test
    void getIncrementRecalculatesNextSlabAtUpperBoundary() {
        Long tournamentId = 7L;
        Tournament tournament = Tournament.builder().id(tournamentId).build();
        when(bidRuleRepository.findByTournamentIdOrderByPositionAscMinAmountAsc(tournamentId))
                .thenReturn(List.of(
                        BidRule.builder().tournament(tournament).minAmount(0.0).maxAmount(10000.0).incrementAmount(1000.0).position(0).build(),
                        BidRule.builder().tournament(tournament).minAmount(10001.0).maxAmount(50000.0).incrementAmount(2000.0).position(1).build(),
                        BidRule.builder().tournament(tournament).minAmount(50001.0).maxAmount(999999999.0).incrementAmount(5000.0).position(2).build()
                ));

        assertThat(bidRuleService.getIncrement(tournamentId, 9000.0)).isEqualTo(1000.0);
        assertThat(bidRuleService.getIncrement(tournamentId, 10000.0)).isEqualTo(2000.0);
        assertThat(bidRuleService.getIncrement(tournamentId, 50000.0)).isEqualTo(5000.0);
    }
}
