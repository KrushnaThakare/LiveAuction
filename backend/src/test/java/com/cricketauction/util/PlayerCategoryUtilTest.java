package com.cricketauction.util;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PlayerCategoryUtilTest {

    @Test
    void normalizeKeyTreatsPlusAsPlus() {
        assertThat(PlayerCategoryUtil.normalizeKey("a+")).isEqualTo("APLUS");
        assertThat(PlayerCategoryUtil.normalizeKey("A +")).isEqualTo("APLUS");
    }

    @Test
    void matchesRuleKeyIgnoresSpacingAndCase() {
        assertThat(PlayerCategoryUtil.matchesRuleKey("a+", "A+")).isTrue();
        assertThat(PlayerCategoryUtil.matchesRuleKey("C", "c")).isTrue();
        assertThat(PlayerCategoryUtil.matchesRuleKey("B", "C")).isFalse();
    }
}