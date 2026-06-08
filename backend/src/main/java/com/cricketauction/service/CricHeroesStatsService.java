package com.cricketauction.service;

import com.cricketauction.entity.Player;
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
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class CricHeroesStatsService {
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(8))
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    public void fetchAndApply(Player player) throws IOException, InterruptedException {
        String profileUrl = player.getCricheroesProfileUrl();
        if (profileUrl == null || profileUrl.isBlank()) {
            throw new IllegalArgumentException("CricHeroes profile URL is required before fetching stats");
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

    private String fetchProfileHtml(String profileUrl) throws IOException, InterruptedException {
        try {
            return fetch(firstStatsUrl(profileUrl));
        } catch (CricHeroesStatusException ex) {
            if (ex.statusCode() == 403 || ex.statusCode() == 404) {
                return fetch(normalizeUrl(profileUrl));
            }
            throw ex;
        }
    }

    private String fetch(String url) throws IOException, InterruptedException {
        URI uri = validatedProfileUri(url);
        HttpRequest request = HttpRequest.newBuilder(uri)
                .timeout(Duration.ofSeconds(12))
                .header("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36")
                .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
                .header("Accept-Language", "en-US,en;q=0.9")
                .header("Cache-Control", "no-cache")
                .GET()
                .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new CricHeroesStatusException(response.statusCode());
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

        public CricHeroesStatusException(int statusCode) {
            super("CricHeroes returned status " + statusCode);
            this.statusCode = statusCode;
        }

        public int statusCode() {
            return statusCode;
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
