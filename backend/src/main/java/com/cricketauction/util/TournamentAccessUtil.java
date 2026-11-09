package com.cricketauction.util;

import com.cricketauction.entity.AppUser;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

public final class TournamentAccessUtil {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private TournamentAccessUtil() {
    }

    public static List<Long> parseAllowedIds(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            List<Long> ids = MAPPER.readValue(raw.trim(), new TypeReference<>() {});
            if (ids == null || ids.isEmpty()) return Collections.emptyList();
            return ids.stream().filter(id -> id != null && id > 0).distinct().toList();
        } catch (Exception ignored) {
            return Collections.emptyList();
        }
    }

    public static String serializeAllowedIds(List<Long> ids) {
        if (ids == null || ids.isEmpty()) return "[]";
        List<Long> clean = ids.stream().filter(id -> id != null && id > 0).distinct().toList();
        try {
            return MAPPER.writeValueAsString(clean);
        } catch (Exception e) {
            return "[]";
        }
    }

    /**
     * null/blank on user = legacy full access (all tournaments).
     * Non-empty list = only those tournament ids.
     */
    public static boolean canAccessTournament(AppUser user, Long tournamentId) {
        if (user == null || tournamentId == null) return true;
        if (user.getRole() == AppUser.UserRole.SUPER_ADMIN) return true;
        String raw = user.getAllowedTournamentIds();
        if (raw == null || raw.isBlank()) return true;
        List<Long> allowed = parseAllowedIds(raw);
        if (allowed == null || allowed.isEmpty()) return false;
        return allowed.contains(tournamentId);
    }

    public static Set<Long> allowedIdSet(AppUser user) {
        List<Long> parsed = parseAllowedIds(user != null ? user.getAllowedTournamentIds() : null);
        if (parsed == null) return null;
        return parsed.stream().collect(Collectors.toSet());
    }
}
