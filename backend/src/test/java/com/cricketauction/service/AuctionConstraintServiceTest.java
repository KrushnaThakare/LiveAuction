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
        // Squad 13, 10 players, ₹40k purse, base ₹1k → 3 slots left → reserve 2×₹1k → max bid ₹38k
        assertThat(service.maxAllowedBid(13, 10, 40000, 1000)).isEqualTo(38000.0);
        assertThat(service.canTeamBid(13, 10, 40000, 38000, 1000)).isTrue();
        assertThat(service.canTeamBid(13, 10, 40000, 38001, 1000)).isFalse();
    }

    @Test
    void sixPlayersLeftCanBidUpToPurseMinusFiveBaseSlots() {
        // 6 slots to fill, ₹7k purse, base ₹1k → reserve 5×₹1k → max bid ₹2k
        assertThat(service.maxAllowedBid(15, 9, 7000, 1000)).isEqualTo(2000.0);
        assertThat(service.canTeamBid(15, 9, 7000, 2000, 1000)).isTrue();
        assertThat(service.canTeamBid(15, 9, 7000, 2001, 1000)).isFalse();
    }

    @Test
    void retainedPlayersCountTowardSquadSize() {
        // 3 retained + 10 purchased = 13 → squad full
        assertThat(service.canTeamBid(13, 13, 100000, 5000, 1000)).isFalse();
        // 3 retained + 9 purchased = 12 → 1 slot left → no reserve needed
        assertThat(service.maxAllowedBid(13, 12, 10000, 1000)).isEqualTo(10000.0);
    }

    @Test
    void cannotExceedRemainingBudget() {
        assertThat(service.canTeamBid(15, 5, 5000, 6000, 1000)).isFalse();
    }
}
