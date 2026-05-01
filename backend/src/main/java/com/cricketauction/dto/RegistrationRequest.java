package com.cricketauction.dto;

import lombok.Data;

@Data
public class RegistrationRequest {
    /** JSON string of all submitted field values */
    private String formData;
    private String playerName;
    private String mobile;
}
