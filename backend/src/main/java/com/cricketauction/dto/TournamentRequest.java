package com.cricketauction.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class TournamentRequest {
    @NotBlank(message = "Tournament name is required")
    private String name;
    private String description;
}
