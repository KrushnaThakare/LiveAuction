package com.cricketauction.util;

import com.fasterxml.jackson.databind.ObjectMapper;

public final class OverlayIntroConfigUtil {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private OverlayIntroConfigUtil() {
    }

    /** Validates JSON object/array; returns trimmed string or null. */
    public static String normalize(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            MAPPER.readTree(raw.trim());
            return raw.trim();
        } catch (Exception ignored) {
            return null;
        }
    }

    public static String defaultConfigJson() {
        return "{\"template\":\"cinematic-reveal\",\"durationSec\":5,\"showPhoto\":true,\"showRole\":true,"
                + "\"showStats\":true,\"backgroundStyle\":\"navy-gradient\",\"animationSpeed\":1,\"photoScalePercent\":100,"
                + "\"introScalePercent\":100,\"displayFields\":[\"battingStyle\",\"bowlingStyle\",\"age\",\"city\","
                + "\"previousTeam\",\"matches\",\"runs\",\"wickets\"]}";
    }
}
