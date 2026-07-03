package com.cricketauction.service;

import com.cricketauction.entity.Tournament;
import com.cricketauction.exception.AuctionException;
import org.springframework.stereotype.Service;

@Service
public class AuctionConstraintService {

    public boolean canTeamBid(int maxSquadSize, int playerCount, double remainingBudget,
                              double bidAmount, double basePrice) {
        if (playerCount >= maxSquadSize) {
            return false;
        }
        if (bidAmount > remainingBudget) {
            return false;
        }
        int playersLeft = maxSquadSize - playerCount;
        // Reserve base price only for slots still to fill after this purchase.
        int slotsAfterPurchase = Math.max(0, playersLeft - 1);
        double minReserve = slotsAfterPurchase * Math.max(0.0, basePrice);
        double maxAllowedBid = remainingBudget - minReserve;
        return bidAmount <= maxAllowedBid;
    }

    public double maxAllowedBid(int maxSquadSize, int playerCount, double remainingBudget, double basePrice) {
        if (playerCount >= maxSquadSize) {
            return 0.0;
        }
        int playersLeft = maxSquadSize - playerCount;
        int slotsAfterPurchase = Math.max(0, playersLeft - 1);
        double minReserve = slotsAfterPurchase * Math.max(0.0, basePrice);
        return Math.max(0.0, remainingBudget - minReserve);
    }

    public void validateTeamBid(String teamName, Tournament tournament, int playerCount,
                                double remainingBudget, double bidAmount, double basePrice) {
        int maxSquadSize = squadSizeOrDefault(tournament.getMaxSquadSize());
        if (playerCount >= maxSquadSize) {
            throw new AuctionException("Team '" + teamName + "' has a full squad (" + maxSquadSize + " players)");
        }
        if (!canTeamBid(maxSquadSize, playerCount, remainingBudget, bidAmount, basePrice)) {
            long maxBid = (long) maxAllowedBid(maxSquadSize, playerCount, remainingBudget, basePrice);
            throw new AuctionException(
                    "Team '" + teamName + "' cannot bid at this amount (max allowed: " + maxBid + ")");
        }
    }

    public int squadSizeOrDefault(Integer value) {
        if (value == null) return 15;
        return Math.max(5, Math.min(30, value));
    }
}
