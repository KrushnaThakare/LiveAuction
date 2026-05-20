package com.cricketauction.service;

import com.cricketauction.entity.PlayerRegistration;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Service
public class RegistrationSheetSyncService {
    private static final Logger log = LoggerFactory.getLogger(RegistrationSheetSyncService.class);

    @Value("${app.sheets.webhook-url:}")
    private String webhookUrl;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public void push(String event, PlayerRegistration reg) {
        if (webhookUrl == null || webhookUrl.isBlank() || reg == null) return;
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("event", event);
            payload.put("registrationId", reg.getId());
            payload.put("tournamentId", reg.getTournament() != null ? reg.getTournament().getId() : null);
            payload.put("playerName", reg.getPlayerName());
            payload.put("mobile", reg.getMobile());
            payload.put("status", reg.getStatus() != null ? reg.getStatus().name() : null);
            payload.put("photoUrl", reg.getPhotoUrl());
            payload.put("submittedAt", reg.getSubmittedAt() != null ? reg.getSubmittedAt().toString() : null);
            payload.put("formData", reg.getFormData() != null ? objectMapper.readValue(reg.getFormData(), Map.class) : Map.of());

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            restTemplate.postForEntity(webhookUrl, new HttpEntity<>(payload, headers), String.class);
        } catch (Exception e) {
            log.warn("Google Sheet sync skipped: {}", e.getMessage());
        }
    }
}
