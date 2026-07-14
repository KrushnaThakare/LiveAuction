package com.cricketauction.util;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.List;

public final class OverlayDetailFieldsUtil {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final int MAX_FIELDS = 2;

    private OverlayDetailFieldsUtil() {
    }

    public static List<String> parse(String raw) {
        if (raw == null || raw.isBlank()) return List.of();
        try {
            List<String> parsed = MAPPER.readValue(raw, new TypeReference<List<String>>() {});
            if (parsed == null) return List.of();
            return parsed.stream()
                    .map(String::trim)
                    .filter(value -> !value.isBlank())
                    .limit(MAX_FIELDS)
                    .toList();
        } catch (Exception ignored) {
            return List.of();
        }
    }

    public static String serialize(List<String> values) {
        List<String> cleaned = values == null ? List.of() : values.stream()
                .map(value -> value == null ? "" : value.trim())
                .filter(value -> !value.isBlank())
                .limit(MAX_FIELDS)
                .toList();
        if (cleaned.isEmpty()) return null;
        try {
            return MAPPER.writeValueAsString(new ArrayList<>(cleaned));
        } catch (Exception e) {
            return null;
        }
    }
}
