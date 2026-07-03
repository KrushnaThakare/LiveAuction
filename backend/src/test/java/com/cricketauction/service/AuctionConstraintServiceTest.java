package com.cricketauction.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AuctionConstraintServiceTest {

    private final AuctionConstraintService service = new AuctionConstraintService();

    @Test
    void fullSquadCannotBid() {
        assertThat(service.canTeamBid(13, 13, 50000, 1000, 1000)).isFalse();
        assertThat(service.maxAllowedBid(13, 13, 50000, 1000)).isEqualTo(0.0);
    }

    @Test
    void minimumPurseReserveLimitsMaxBid() {
        // Squad 13, 10 players, ₹40k purse, base ₹1k → 3 slots left → reserve ₹3k → max bid ₹37k
        assertThat(service.maxAllowedBid(13, 10, 40000, 1000)).isEqualTo(37000.0);
        assertThat(service.canTeamBid(13, 10, 40000, 37000, 1000)).isTrue();
        assertThat(service.canTeamBid(13, 10, 40000, 37001, 1000)).isFalse();
    }

    @Test
    void retainedPlayersCountTowardSquadSize() {
        // 3 retained + 10 purchased = 13 → squad full
        assertThat(service.canTeamBid(13, 13, 100000, 5000, 1000)).isFalse();
        // 3 retained + 9 purchased = 12 → 1 slot left
        assertThat(service.maxAllowedBid(13, 12, 10000, 1000)).isEqualTo(9000.0);
    }

    @Test
    void cannotExceedRemainingBudget() {
        assertThat(service.canTeamBid(15, 5, 5000, 6000, 1000)).isFalse();
    }
}
