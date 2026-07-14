package com.cricketauction.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlayerRoleDto {
    private String key;
    private String label;
    private String shortLabel;
    private String color;
    private String icon;
    private List<String> aliases;
}
