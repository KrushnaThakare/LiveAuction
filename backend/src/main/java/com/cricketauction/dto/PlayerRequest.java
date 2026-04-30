package com.cricketauction.dto;

import com.cricketauction.entity.Player;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PlayerRequest {
    @NotBlank(message = "Player name is required")
    private String name;

    @NotNull(message = "Role is required")
    private Player.PlayerRole role;

    @NotNull(message = "Base price is required")
    @Min(value = 1, message = "Base price must be positive")
    private Double basePrice;

    private String imageUrl;
}
