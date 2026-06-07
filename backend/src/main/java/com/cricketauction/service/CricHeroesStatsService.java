package com.cricketauction.service;

import com.cricketauction.entity.Player;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
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

        String html = fetch(firstStatsUrl(profileUrl));
        String text = toReadableText(html);

        player.setStatsMatches(parseInteger(text, "matches").orElse(player.getStatsMatches()));
        player.setStatsRuns(parseInteger(text, "runs").orElse(player.getStatsRuns()));
        player.setStatsWickets(parseInteger(text, "wickets").orElse(player.getStatsWickets()));
        player.setStatsStrikeRate(parseDecimal(text, "strike\\s*rate|sr").orElse(player.getStatsStrikeRate()));
        player.setStatsEconomy(parseDecimal(text, "economy|econ").orElse(player.getStatsEconomy()));
        player.setStatsAverage(parseDecimal(text, "average|avg").orElse(player.getStatsAverage()));
        player.setStatsLastUpdatedAt(LocalDateTime.now());
    }

    private String fetch(String url) throws IOException, InterruptedException {
        HttpRequest request = HttpRequest.newBuilder(URI.create(normalizeUrl(url)))
                .timeout(Duration.ofSeconds(12))
                .header("User-Agent", "Mozilla/5.0 CricketAuctionStatsBot/1.0")
                .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
                .GET()
                .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new IllegalStateException("CricHeroes returned status " + response.statusCode());
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
