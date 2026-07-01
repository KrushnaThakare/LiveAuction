package com.cricketauction.service;

import com.cricketauction.entity.Player;
import com.cricketauction.entity.PlayerRegistration;
import com.cricketauction.entity.Tournament;
import com.cricketauction.exception.ResourceNotFoundException;
import com.cricketauction.repository.PlayerRegistrationRepository;
import com.cricketauction.repository.PlayerRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

@Service
public class WhatsAppNotifyService {
    private static final Logger log = LoggerFactory.getLogger(WhatsAppNotifyService.class);
    private static final Pattern MOBILE_LABEL = Pattern.compile("mobile|phone|whatsapp", Pattern.CASE_INSENSITIVE);
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Value("${whatsapp.enabled:false}")
    private boolean enabled;

    @Value("${whatsapp.api-token:}")
    private String apiToken;

    @Value("${whatsapp.phone-number-id:}")
    private String phoneNumberId;

    @Value("${whatsapp.api-version:v21.0}")
    private String apiVersion;

    @Value("${whatsapp.template-name:player_sold_congrats}")
    private String templateName;

    @Value("${whatsapp.template-language:en}")
    private String templateLanguage;

    @Value("${whatsapp.mode:template}")
    private String mode;

    private final PlayerRepository playerRepository;
    private final PlayerRegistrationRepository registrationRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    public WhatsAppNotifyService(PlayerRepository playerRepository,
                                 PlayerRegistrationRepository registrationRepository) {
        this.playerRepository = playerRepository;
        this.registrationRepository = registrationRepository;
    }

    public boolean isConfigured() {
        return enabled
                && apiToken != null && !apiToken.isBlank()
                && phoneNumberId != null && !phoneNumberId.isBlank();
    }

    @Async
    public void notifyPlayerSoldAsync(Long tournamentId, Long playerId) {
        try {
            sendSoldNotification(tournamentId, playerId);
        } catch (Exception e) {
            log.warn("WhatsApp sold notification failed for player {}: {}", playerId, e.getMessage());
        }
    }

    @Transactional
    public void sendSoldNotification(Long tournamentId, Long playerId) {
        Player player = playerRepository.findById(playerId)
                .orElseThrow(() -> new ResourceNotFoundException("Player", playerId));

        if (player.getTournament() == null || !player.getTournament().getId().equals(tournamentId)) {
            throw new IllegalArgumentException("Player does not belong to this tournament");
        }
        if (player.getStatus() != Player.PlayerStatus.SOLD) {
            markStatus(player, Player.WhatsAppNotifyStatus.SKIPPED, "Player is not sold");
            return;
        }

        player.setWhatsappNotifyStatus(Player.WhatsAppNotifyStatus.PENDING);
        player.setWhatsappNotifyError(null);
        playerRepository.save(player);

        Tournament tournament = player.getTournament();
        if (!Boolean.TRUE.equals(tournament.getWhatsappAutoEnabled())) {
            markStatus(player, Player.WhatsAppNotifyStatus.SKIPPED, "Auto WhatsApp disabled for tournament");
            return;
        }
        if (!isConfigured()) {
            markStatus(player, Player.WhatsAppNotifyStatus.SKIPPED, "WhatsApp API not configured on server");
            return;
        }

        String mobile = resolveMobile(player, tournament.getId());
        if (mobile == null) {
            markStatus(player, Player.WhatsAppNotifyStatus.SKIPPED, "No mobile number on file");
            return;
        }

        String teamName = player.getTeam() != null ? player.getTeam().getName() : "your team";
        String tournamentName = tournament.getAuctionDisplayName() != null && !tournament.getAuctionDisplayName().isBlank()
                ? tournament.getAuctionDisplayName()
                : tournament.getName();
        double soldAmount = player.getCurrentBid() == null ? 0.0 : player.getCurrentBid();

        try {
            dispatchMessage(mobile, player.getName(), teamName, tournamentName, soldAmount);
            markStatus(player, Player.WhatsAppNotifyStatus.SENT, null);
            log.info("WhatsApp sold notification sent to player {} ({})", player.getId(), maskMobile(mobile));
        } catch (Exception e) {
            String detail = extractErrorMessage(e);
            markStatus(player, Player.WhatsAppNotifyStatus.FAILED, detail);
            log.warn("WhatsApp sold notification failed for player {}: {}", player.getId(), detail);
        }
    }

    private void dispatchMessage(String mobile, String playerName, String teamName,
                                 String tournamentName, double soldAmount) {
        String url = "https://graph.facebook.com/" + apiVersion + "/" + phoneNumberId + "/messages";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiToken.trim());

        Map<String, Object> payload = "text".equalsIgnoreCase(mode)
                ? buildTextPayload(mobile, playerName, teamName, tournamentName, soldAmount)
                : buildTemplatePayload(mobile, playerName, teamName, tournamentName, soldAmount);

        try {
            restTemplate.postForEntity(url, new HttpEntity<>(payload, headers), String.class);
        } catch (RestClientResponseException e) {
            throw new IllegalStateException(parseApiError(e.getResponseBodyAsString()), e);
        }
    }

    private Map<String, Object> buildTextPayload(String mobile, String playerName, String teamName,
                                                 String tournamentName, double soldAmount) {
        String body = buildMessageBody(playerName, teamName, tournamentName, soldAmount);
        return Map.of(
                "messaging_product", "whatsapp",
                "to", mobile,
                "type", "text",
                "text", Map.of("body", body)
        );
    }

    private Map<String, Object> buildTemplatePayload(String mobile, String playerName, String teamName,
                                                     String tournamentName, double soldAmount) {
        List<Map<String, Object>> parameters = new ArrayList<>();
        parameters.add(textParam(playerName));
        parameters.add(textParam(teamName));
        parameters.add(textParam(tournamentName));
        parameters.add(textParam(formatCurrency(soldAmount)));

        Map<String, Object> template = new LinkedHashMap<>();
        template.put("name", templateName);
        template.put("language", Map.of("code", templateLanguage));
        template.put("components", List.of(Map.of(
                "type", "body",
                "parameters", parameters
        )));

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("messaging_product", "whatsapp");
        payload.put("to", mobile);
        payload.put("type", "template");
        payload.put("template", template);
        return payload;
    }

    private Map<String, Object> textParam(String value) {
        return Map.of("type", "text", "text", value == null || value.isBlank() ? "-" : value);
    }

    private String buildMessageBody(String playerName, String teamName, String tournamentName, double soldAmount) {
        return String.join("\n",
                "Congratulations " + (playerName == null ? "Player" : playerName) + "!",
                "",
                "You have been selected by " + teamName + " in " + tournamentName + ".",
                "Sold amount: " + formatCurrency(soldAmount) + ".",
                "",
                "See you at the tournament!"
        );
    }

    String resolveMobile(Player player, Long tournamentId) {
        PlayerRegistration reg = registrationRepository
                .findByTournamentIdAndImportedPlayerId(tournamentId, player.getId())
                .orElseGet(() -> registrationRepository
                        .findFirstByTournamentIdAndPlayerNameIgnoreCase(tournamentId, player.getName())
                        .orElse(null));

        if (reg != null && reg.getMobile() != null && !reg.getMobile().isBlank()) {
            return normalizePhone(reg.getMobile());
        }

        Map<String, String> extra = parseExtraData(player.getExtraData());
        for (Map.Entry<String, String> entry : extra.entrySet()) {
            if (MOBILE_LABEL.matcher(entry.getKey()).find() && entry.getValue() != null && !entry.getValue().isBlank()) {
                String phone = normalizePhone(entry.getValue());
                if (phone != null) return phone;
            }
        }

        if (reg != null) {
            Map<String, Object> formData = parseFormData(reg.getFormData());
            for (String key : List.of("mobile", "phone", "whatsapp")) {
                Object value = formData.get(key);
                if (value != null) {
                    String phone = normalizePhone(String.valueOf(value));
                    if (phone != null) return phone;
                }
            }
            for (Map.Entry<String, Object> entry : formData.entrySet()) {
                if (MOBILE_LABEL.matcher(entry.getKey()).find() && entry.getValue() != null) {
                    String phone = normalizePhone(String.valueOf(entry.getValue()));
                    if (phone != null) return phone;
                }
            }
        }

        return null;
    }

    private String normalizePhone(String raw) {
        if (raw == null) return null;
        String digits = raw.replaceAll("\\D", "");
        if (digits.isEmpty()) return null;
        if (digits.length() == 10) return "91" + digits;
        if (digits.length() == 12 && digits.startsWith("91")) return digits;
        if (digits.length() == 11 && digits.startsWith("0")) return "91" + digits.substring(1);
        if (digits.length() >= 10 && digits.length() <= 15) return digits;
        return null;
    }

    private Map<String, String> parseExtraData(String raw) {
        if (raw == null || raw.isBlank()) return Map.of();
        try {
            Map<String, String> parsed = OBJECT_MAPPER.readValue(raw, new TypeReference<LinkedHashMap<String, String>>() {});
            return parsed != null ? parsed : Map.of();
        } catch (Exception e) {
            return Map.of();
        }
    }

    private Map<String, Object> parseFormData(String raw) {
        if (raw == null || raw.isBlank()) return Map.of();
        try {
            Map<String, Object> parsed = OBJECT_MAPPER.readValue(raw, new TypeReference<LinkedHashMap<String, Object>>() {});
            return parsed != null ? parsed : Map.of();
        } catch (Exception e) {
            return Map.of();
        }
    }

    private void markStatus(Player player, Player.WhatsAppNotifyStatus status, String error) {
        player.setWhatsappNotifyStatus(status);
        player.setWhatsappNotifyError(error);
        player.setWhatsappSentAt(status == Player.WhatsAppNotifyStatus.SENT ? LocalDateTime.now() : player.getWhatsappSentAt());
        playerRepository.save(player);
    }

    private String formatCurrency(double amount) {
        if (amount >= 100_000) {
            return String.format(Locale.ENGLISH, "₹%.2fL", amount / 100_000.0);
        }
        if (amount >= 1_000) {
            return String.format(Locale.ENGLISH, "₹%.1fK", amount / 1_000.0);
        }
        return String.format(Locale.ENGLISH, "₹%,.0f", amount);
    }

    private String maskMobile(String phone) {
        if (phone == null || phone.length() < 4) return "****";
        return "******" + phone.substring(phone.length() - 4);
    }

    private String extractErrorMessage(Exception e) {
        if (e instanceof RestClientResponseException r) {
            return parseApiError(r.getResponseBodyAsString());
        }
        String message = e.getMessage();
        return message == null || message.isBlank() ? "WhatsApp API request failed" : message;
    }

    private String parseApiError(String body) {
        if (body == null || body.isBlank()) return "WhatsApp API request failed";
        try {
            JsonNode root = OBJECT_MAPPER.readTree(body);
            JsonNode err = root.path("error").path("message");
            if (!err.isMissingNode() && !err.asText().isBlank()) {
                return err.asText();
            }
        } catch (Exception ignored) {
            // fall through
        }
        return body.length() > 240 ? body.substring(0, 240) : body;
    }
}
