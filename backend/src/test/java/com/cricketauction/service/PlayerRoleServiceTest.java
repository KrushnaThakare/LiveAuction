package com.cricketauction.service;

import com.cricketauction.entity.Tournament;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class PlayerRoleServiceTest {

    private PlayerRoleService service;

    @BeforeEach
    void setUp() {
        service = new PlayerRoleService(new ObjectMapper());
    }

    @Test
    void resolveRole_matchesAllRounderFromExcelStyleValues() {
        Tournament tournament = Tournament.builder().sport("CRICKET").build();
        assertEquals("ALL_ROUNDER", service.resolveRole(tournament, "All-Rounder"));
        assertEquals("ALL_ROUNDER", service.resolveRole(tournament, "All Rounder"));
        assertEquals("ALL_ROUNDER", service.resolveRole(tournament, "AR"));
        assertEquals("BOWLER", service.resolveRole(tournament, "Bowler"));
        assertEquals("BATSMAN", service.resolveRole(tournament, "Batsman"));
    }

    @Test
    void resolveRole_usesDefaultAliasesForCustomConfiguredRoles() throws Exception {
        Tournament tournament = Tournament.builder()
                .sport("CRICKET")
                .playerRolesConfig("""
                        [{"key":"BATSMAN","label":"Batsman","shortLabel":"BAT","color":"#3b82f6","icon":"BAT","aliases":[]},
                         {"key":"ALL_ROUNDER","label":"All-Rounder","shortLabel":"AR","color":"#10b981","icon":"AR","aliases":[]}]
                        """)
                .build();
        assertEquals("ALL_ROUNDER", service.resolveRole(tournament, "Allrounder"));
    }
}
