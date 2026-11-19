package com.cricketauction.util;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.List;

public final class CategoryQuotaConfigUtil {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private CategoryQuotaConfigUtil() {
    }

    public static CategoryQuotaConfig parse(String raw) {
        if (raw == null || raw.isBlank()) {
            return new CategoryQuotaConfig(List.of(), false);
        }
        try {
            CategoryQuotaConfig parsed = MAPPER.readValue(raw.trim(), CategoryQuotaConfig.class);
            if (parsed == null) return new CategoryQuotaConfig(List.of(), false);
            List<CategoryRule> rules = parsed.categories != null ? parsed.categories : List.of();
            List<CategoryRule> clean = new ArrayList<>();
            for (CategoryRule r : rules) {
                if (r == null || r.key == null || r.key.isBlank()) continue;
                clean.add(r);
            }
            return new CategoryQuotaConfig(clean, parsed.strictMandatoryFirst);
        } catch (Exception e) {
            return new CategoryQuotaConfig(List.of(), true);
        }
    }

    public static String serialize(CategoryQuotaConfig config) {
        if (config == null || config.categories == null || config.categories.isEmpty()) return null;
        try {
            return MAPPER.writeValueAsString(config);
        } catch (Exception e) {
            return null;
        }
    }

    public static class CategoryQuotaConfig {
        public List<CategoryRule> categories = List.of();
        public boolean strictMandatoryFirst = true;

        public CategoryQuotaConfig() {
        }

        public CategoryQuotaConfig(List<CategoryRule> categories, boolean strictMandatoryFirst) {
            this.categories = categories;
            this.strictMandatoryFirst = strictMandatoryFirst;
        }
    }

    public static class CategoryRule {
        public String key;
        public String label;
        public Integer minPerTeam;
        public Integer maxPerTeam;
        public Double reserveBasePrice;

        public int minOrZero() {
            return minPerTeam == null || minPerTeam < 0 ? 0 : minPerTeam;
        }

        public int maxOrLarge() {
            if (maxPerTeam == null || maxPerTeam < 0) return Integer.MAX_VALUE;
            return Math.max(maxPerTeam, minOrZero());
        }

        public double reserveFloor() {
            return reserveBasePrice == null || reserveBasePrice < 0 ? 0.0 : reserveBasePrice;
        }
    }
}