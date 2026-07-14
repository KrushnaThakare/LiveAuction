package com.cricketauction.service;

import com.cricketauction.entity.Player;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpConnectTimeoutException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Consumer;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class CricHeroesStatsService {
    private static final Logger log = LoggerFactory.getLogger(CricHeroesStatsService.class);

    private final ObjectMapper objectMapper;

    @Value("${cricheroes.worker.url:}")
    private String workerUrl;

    @Value("${cricheroes.worker.token:}")
    private String workerToken;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(8))
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    public CricHeroesStatsService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public void fetchAndApply(Player player) throws IOException, InterruptedException {
        String profileUrl = player.getCricheroesProfileUrl();
        if (profileUrl == null || profileUrl.isBlank()) {
            throw new IllegalArgumentException("CricHeroes profile URL is required before fetching stats");
        }

        if (isWorkerConfigured()) {
            fetchViaWorkerAndApply(player, profileUrl);
            return;
        }

        String html = fetchProfileHtml(profileUrl);
        String text = toReadableText(html);

        player.setStatsMatches(parseInteger(text, "matches").orElse(player.getStatsMatches()));
        player.setStatsRuns(parseInteger(text, "runs").orElse(player.getStatsRuns()));
        player.setStatsWickets(parseInteger(text, "wickets").orElse(player.getStatsWickets()));
        player.setStatsStrikeRate(parseDecimal(text, "strike\\s*rate|sr").orElse(player.getStatsStrikeRate()));
        player.setStatsEconomy(parseDecimal(text, "economy|econ").orElse(player.getStatsEconomy()));
        player.setStatsAverage(parseDecimal(text, "average|avg").orElse(player.getStatsAverage()));
        player.setStatsLastUpdatedAt(LocalDateTime.now());
    }

    private boolean isWorkerConfigured() {
        return workerUrl != null && !workerUrl.isBlank();
    }

    private void fetchViaWorkerAndApply(Player player, String profileUrl) throws IOException, InterruptedException {
        String endpoint = workerUrl.replaceAll("/+$", "") + "/fetch-stats";
        String body = objectMapper.writeValueAsString(Map.of("profileUrl", profileUrl));
        HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(endpoint))
                .timeout(Duration.ofSeconds(35))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body));
        if (workerToken != null && !workerToken.isBlank()) {
            builder.header("Authorization", "Bearer " + workerToken);
        }

        HttpResponse<String> response = httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofString());
        JsonNode root = parseJson(response.body());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            String code = root.path("code").asText("WORKER_ERROR");
            String message = root.path("message").asText("CricHeroes worker failed with HTTP " + response.statusCode());
            log.warn("CricHeroes worker failed. status={} code={} playerId={} url={} message={}",
                    response.statusCode(), code, player.getId(), profileUrl, message);
            throw new IOException("CricHeroes worker failed (" + code + "): " + message);
        }

        JsonNode data = root.path("data");
        boolean changed = false;
        changed |= applyInt(data, "statsMatches", player::setStatsMatches);
        changed |= applyInt(data, "statsRuns", player::setStatsRuns);
        changed |= applyInt(data, "statsWickets", player::setStatsWickets);
        changed |= applyDouble(data, "statsStrikeRate", player::setStatsStrikeRate);
        changed |= applyDouble(data, "statsEconomy", player::setStatsEconomy);
        changed |= applyDouble(data, "statsAverage", player::setStatsAverage);

        if (!changed) {
            throw new IOException("CricHeroes worker returned no stats for this player");
        }
        player.setStatsLastUpdatedAt(LocalDateTime.now());
        log.info("CricHeroes stats fetched via worker. playerId={} source={}", player.getId(), data.path("sourceUrl").asText(""));
    }

    private String fetchProfileHtml(String profileUrl) throws IOException, InterruptedException {
        List<String> candidates = List.of(
                firstStatsUrl(profileUrl),
                normalizeUrl(profileUrl),
                normalizeUrl(profileUrl).replaceAll("/+$", "") + "/profile"
        );
        CricHeroesStatusException lastStatus = null;
        boolean blocked = false;

        for (String candidate : candidates) {
            try {
                return fetch(candidate);
            } catch (CricHeroesStatusException ex) {
                lastStatus = ex;
                if (ex.statusCode() == 403) {
                    blocked = true;
                    log.warn("CricHeroes blocked stats fetch with HTTP 403. url={} snippet={}", ex.url(), ex.bodySnippet());
                    continue;
                }
                if (ex.statusCode() == 404) {
                    log.info("CricHeroes stats candidate was not found. url={}", ex.url());
                    continue;
                }
                throw ex;
            }
        }

        if (blocked) {
            throw new CricHeroesBlockedException();
        }
        if (lastStatus != null) throw lastStatus;
        throw new IOException("CricHeroes stats page could not be fetched");
    }

    private String fetch(String url) throws IOException, InterruptedException {
        URI uri = validatedProfileUri(url);
        HttpRequest request = HttpRequest.newBuilder(uri)
                .timeout(Duration.ofSeconds(12))
                .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")
                .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8")
                .header("Accept-Language", "en-IN,en-US;q=0.9,en;q=0.8")
                .header("Referer", "https://cricheroes.com/")
                .header("Upgrade-Insecure-Requests", "1")
                .header("Sec-Fetch-Dest", "document")
                .header("Sec-Fetch-Mode", "navigate")
                .header("Sec-Fetch-Site", "same-origin")
                .header("Sec-Fetch-User", "?1")
                .header("Cache-Control", "no-cache")
                .GET()
                .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new CricHeroesStatusException(response.statusCode(), uri.toString(), snippet(response.body()));
        }
        return response.body();
    }

    private String firstStatsUrl(String profileUrl) {
        String clean = normalizeUrl(profileUrl);
        if (clean.endsWith("/stats")) return clean;
        if (clean.matches(".*/(matches|awards|badges|teams|photos|connections|profile)$")) {
            return clean.replaceFirst("/(matches|awards|badges|teams|photos|connections|profile)$", "/stats");
        }
        return clean.replaceAll("/+$", "") + "/stats";
    }

    private URI validatedProfileUri(String url) {
        URI uri = URI.create(normalizeUrl(url));
        String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase();
        String path = uri.getPath() == null ? "" : uri.getPath();
        if (!host.endsWith("cricheroes.com") || !path.matches(".*/player-profile/\\d+.*")) {
            throw new IllegalArgumentException("Only CricHeroes player profile URLs are supported");
        }
        return uri;
    }

    public boolean isTimeout(Exception ex) {
        return ex instanceof HttpTimeoutException || ex instanceof HttpConnectTimeoutException;
    }

    public static class CricHeroesStatusException extends IOException {
        private final int statusCode;
        private final String url;
        private final String bodySnippet;

        public CricHeroesStatusException(int statusCode, String url, String bodySnippet) {
            super("CricHeroes returned status " + statusCode);
            this.statusCode = statusCode;
            this.url = url;
            this.bodySnippet = bodySnippet;
        }

        public int statusCode() {
            return statusCode;
        }

        public String url() {
            return url;
        }

        public String bodySnippet() {
            return bodySnippet;
        }
    }

    public static class CricHeroesBlockedException extends IOException {
        public CricHeroesBlockedException() {
            super("CricHeroes blocked this backend request with HTTP 403. This is server-side bot/IP protection, not an invalid profile URL. Use cached/manual stats or try again later from a trusted network.");
        }
    }

    private String normalizeUrl(String url) {
        if (url == null || url.isBlank()) {
            throw new IllegalArgumentException("CricHeroes profile URL is required before fetching stats");
        }
        String clean = url.trim();
        if (clean.startsWith("//")) return "https:" + clean;
        if (clean.startsWith("/player-profile/")) return "https://cricheroes.com" + clean;
        if (!clean.matches("(?i)^https?://.*")) return "https://" + clean;
        return clean;
    }

    private String toReadableText(String html) {
        return html
                .replaceAll("(?is)<script.*?</script>", " ")
                .replaceAll("(?is)<style.*?</style>", " ")
                .replaceAll("(?is)<[^>]+>", " ")
                .replace("&nbsp;", " ")
                .replace("&amp;", "&")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private String snippet(String body) {
        if (body == null || body.isBlank()) return "";
        String clean = body.replaceAll("\\s+", " ").trim();
        return clean.substring(0, Math.min(180, clean.length()));
    }

    private JsonNode parseJson(String body) throws IOException {
        if (body == null || body.isBlank()) return objectMapper.createObjectNode();
        return objectMapper.readTree(body);
    }

    private boolean applyInt(JsonNode node, String field, Consumer<Integer> setter) {
        JsonNode value = node.path(field);
        if (value.isMissingNode() || value.isNull()) return false;
        setter.accept(value.asInt());
        return true;
    }

    private boolean applyDouble(JsonNode node, String field, Consumer<Double> setter) {
        JsonNode value = node.path(field);
        if (value.isMissingNode() || value.isNull()) return false;
        setter.accept(value.asDouble());
        return true;
    }

    private Optional<Integer> parseInteger(String text, String label) {
        return parseDecimal(text, label).map(Double::intValue);
    }

    private Optional<Double> parseDecimal(String text, String label) {
        Pattern valueBeforeLabel = Pattern.compile("(?i)(\\d+(?:\\.\\d+)?)\\s*(?:" + label + ")\\b");
        Matcher before = valueBeforeLabel.matcher(text);
        if (before.find()) {
            return Optional.of(Double.parseDouble(before.group(1)));
        }

        Pattern labelBeforeValue = Pattern.compile("(?i)(?:" + label + ")\\s*[:\\-]?\\s*(\\d+(?:\\.\\d+)?)\\b");
        Matcher after = labelBeforeValue.matcher(text);
        if (after.find()) {
            return Optional.of(Double.parseDouble(after.group(1)));
        }

        return Optional.empty();
    }
}
