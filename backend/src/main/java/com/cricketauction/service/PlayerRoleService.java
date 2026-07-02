package com.cricketauction.service;

import com.cricketauction.dto.PlayerRoleDto;
import com.cricketauction.entity.Tournament;
import com.cricketauction.exception.AuctionException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;

@Service
public class PlayerRoleService {
    private final ObjectMapper objectMapper;

    public PlayerRoleService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public List<PlayerRoleDto> getRoles(Tournament tournament) {
        List<PlayerRoleDto> defaults = defaultRoles(tournament != null ? tournament.getSport() : null);
        if (tournament != null && tournament.getPlayerRolesConfig() != null && !tournament.getPlayerRolesConfig().isBlank()) {
            try {
                List<PlayerRoleDto> roles = objectMapper.readValue(
                        tournament.getPlayerRolesConfig(),
                        new TypeReference<List<PlayerRoleDto>>() {});
                if (roles != null && !roles.isEmpty()) {
                    return roles.stream()
                            .map(role -> mergeWithDefaultAliases(role, defaults))
                            .toList();
                }
            } catch (Exception ignored) {
                // Fall back to sport preset when stored JSON is invalid.
            }
        }
        return defaults;
    }

    public String toConfigJson(List<PlayerRoleDto> roles, String sport) {
        try {
            List<PlayerRoleDto> source = roles == null || roles.isEmpty() ? defaultRoles(sport) : roles;
            return objectMapper.writeValueAsString(source.stream()
                    .map(this::normalizeRoleConfig)
                    .toList());
        } catch (Exception e) {
            throw new AuctionException("Invalid player role configuration");
        }
    }

    public String resolveRole(Tournament tournament, String rawRole) {
        List<PlayerRoleDto> roles = getRoles(tournament);
        if (roles.isEmpty()) return "BATSMAN";
        if (rawRole == null || rawRole.isBlank()) return normalizeRoleKey(roles.get(0).getKey());

        String normalizedRaw = normalizeComparable(rawRole);
        return roles.stream()
                .filter(role -> matches(role, normalizedRaw))
                .findFirst()
                .map(role -> normalizeRoleKey(role.getKey()))
                .orElseThrow(() -> new AuctionException("Role '" + rawRole + "' is not configured for this tournament"));
    }

    public List<PlayerRoleDto> defaultRoles(String sport) {
        String normalizedSport = sport == null ? "CRICKET" : sport.trim().toUpperCase(Locale.ROOT);
        if ("FOOTBALL".equals(normalizedSport)) {
            return List.of(
                    role("FORWARD", "Forward", "FWD", "#3b82f6", "FWD", "striker", "attacker", "fw"),
                    role("MIDFIELDER", "Midfielder", "MID", "#10b981", "MID", "mid", "mf"),
                    role("DEFENDER", "Defender", "DEF", "#ef4444", "DEF", "defence", "defense", "df"),
                    role("GOALKEEPER", "Goalkeeper", "GK", "#f59e0b", "GK", "goal keeper", "keeper")
            );
        }
        return List.of(
                role("BATSMAN", "Batsman", "BAT", "#3b82f6", "BAT", "bat", "batter", "batsmen"),
                role("BOWLER", "Bowler", "BOWL", "#ef4444", "BOWL", "bowl", "b"),
                role("ALL_ROUNDER", "All-Rounder", "AR", "#10b981", "AR", "all rounder", "allrounder", "all-rounder", "ar"),
                role("WICKET_KEEPER", "Wicket Keeper", "WK", "#f59e0b", "WK", "wicketkeeper", "keeper", "wkt", "wk")
        );
    }

    private PlayerRoleDto normalizeRoleConfig(PlayerRoleDto role) {
        return PlayerRoleDto.builder()
                .key(normalizeRoleKey(role.getKey()))
                .label(blankToDefault(role.getLabel(), role.getKey()))
                .shortLabel(blankToDefault(role.getShortLabel(), role.getKey()))
                .color(blankToDefault(role.getColor(), "#64748b"))
                .icon(role.getIcon())
                .aliases(role.getAliases() == null ? List.of() : role.getAliases())
                .build();
    }

    private boolean matches(PlayerRoleDto role, String normalizedRaw) {
        if (normalizeComparable(role.getKey()).equals(normalizedRaw)) return true;
        if (normalizeComparable(role.getLabel()).equals(normalizedRaw)) return true;
        if (normalizeComparable(role.getShortLabel()).equals(normalizedRaw)) return true;
        return role.getAliases() != null && role.getAliases().stream()
                .anyMatch(alias -> normalizeComparable(alias).equals(normalizedRaw));
    }

    private PlayerRoleDto role(String key, String label, String shortLabel, String color, String icon, String... aliases) {
        return PlayerRoleDto.builder()
                .key(key)
                .label(label)
                .shortLabel(shortLabel)
                .color(color)
                .icon(icon)
                .aliases(List.of(aliases))
                .build();
    }

    private String normalizeRoleKey(String value) {
        return value == null || value.isBlank()
                ? "ROLE"
                : value.trim().toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]+", "_").replaceAll("^_+|_+$", "");
    }

    private String normalizeComparable(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]", "");
    }

    private String blankToDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }

    private PlayerRoleDto mergeWithDefaultAliases(PlayerRoleDto role, List<PlayerRoleDto> defaults) {
        PlayerRoleDto fallback = defaults.stream()
                .filter(item -> normalizeRoleKey(item.getKey()).equals(normalizeRoleKey(role.getKey())))
                .findFirst()
                .orElse(null);
        if (fallback == null) return normalizeRoleConfig(role);

        LinkedHashSet<String> aliases = new LinkedHashSet<>();
        if (role.getAliases() != null) aliases.addAll(role.getAliases());
        if (fallback.getAliases() != null) aliases.addAll(fallback.getAliases());
        return PlayerRoleDto.builder()
                .key(normalizeRoleKey(role.getKey()))
                .label(blankToDefault(role.getLabel(), fallback.getLabel()))
                .shortLabel(blankToDefault(role.getShortLabel(), fallback.getShortLabel()))
                .color(blankToDefault(role.getColor(), fallback.getColor()))
                .icon(blankToDefault(role.getIcon(), fallback.getIcon()))
                .aliases(new ArrayList<>(aliases))
                .build();
    }
}
