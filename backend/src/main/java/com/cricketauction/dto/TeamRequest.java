package com.cricketauction.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class TeamRequest {
    @NotBlank(message = "Team name is required")
    private String name;

    @JsonInclude(JsonInclude.Include.NON_EMPTY)
    private String logoUrl;

    @NotNull(message = "Budget is required")
    @Min(value = 0, message = "Budget must be non-negative")
    private Double budget;
}
