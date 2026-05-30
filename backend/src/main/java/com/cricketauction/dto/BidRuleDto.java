package com.cricketauction.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class BidRuleDto {
    private Long id;
    private Double minAmount;
    private Double maxAmount;
    private Double incrementAmount;
    private Integer position;
}
