package com.cricketauction.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class BidRequest {
    @NotNull(message = "Team ID is required")
    private Long teamId;
}
