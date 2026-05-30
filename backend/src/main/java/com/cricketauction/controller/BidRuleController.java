package com.cricketauction.controller;

import com.cricketauction.dto.ApiResponse;
import com.cricketauction.dto.BidRuleDto;
import com.cricketauction.service.BidRuleService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tournaments/{tournamentId}/bid-rules")
public class BidRuleController {
    private final BidRuleService bidRuleService;

    public BidRuleController(BidRuleService bidRuleService) {
        this.bidRuleService = bidRuleService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<BidRuleDto>>> getRules(@PathVariable Long tournamentId) {
        return ResponseEntity.ok(ApiResponse.success(bidRuleService.getRules(tournamentId)));
    }

    @PutMapping
    public ResponseEntity<ApiResponse<List<BidRuleDto>>> replaceRules(@PathVariable Long tournamentId,
                                                                       @RequestBody List<BidRuleDto> rules) {
        return ResponseEntity.ok(ApiResponse.success("Bid rules updated", bidRuleService.replaceRules(tournamentId, rules)));
    }
}
