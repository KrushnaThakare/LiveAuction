package com.cricketauction.util;

import java.util.Locale;

public final class PlayerCategoryUtil {

    private PlayerCategoryUtil() {
    }

    /** Normalized key used for matching quota rules, e.g. "A+" → "APLUS" */
    public static String normalizeKey(String raw) {
        if (raw == null || raw.isBlank()) return "";
        String s = raw.trim().toUpperCase(Locale.ROOT);
        s = s.replaceAll("[\\s_]+", "");
        s = s.replace("+", "PLUS").replace("-", "MINUS");
        return s.replaceAll("[^A-Z0-9]", "");
    }

    public static boolean matchesRuleKey(String playerCategory, String ruleKey) {
        if (ruleKey == null || ruleKey.isBlank()) return false;
        String pk = normalizeKey(playerCategory);
        String rk = normalizeKey(ruleKey);
        return !pk.isEmpty() && pk.equals(rk);
    }
}