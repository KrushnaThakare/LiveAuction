package com.cricketauction.dto;

import com.cricketauction.entity.PlayerRegistration;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class RegistrationResponse {
    private Long id;
    private Long tournamentId;
    private String playerName;
    private String mobile;
    private String photoUrl;
    private String formData;
    private PlayerRegistration.RegistrationStatus status;
    private Long importedPlayerId;
    private LocalDateTime submittedAt;
}
