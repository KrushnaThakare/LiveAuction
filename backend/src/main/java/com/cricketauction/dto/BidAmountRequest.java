package com.cricketauction.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class BidAmountRequest {
    @NotNull(message = "Bid amount is required")
    private Double amount;
}
