package com.cricketauction.dto;

import lombok.Data;

@Data
public class TournamentRegistrationSettings {
    private Boolean registrationEnabled;
    private String registrationMessage;
    private String registrationRedirectLink;
}
