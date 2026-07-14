package com.cricketauction.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class TeamImportResult {
    private int imported;
    private int skipped;
    private List<String> warnings;
    private List<TeamResponse> teams;
}
