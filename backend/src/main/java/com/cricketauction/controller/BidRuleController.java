package com.cricketauction.controller;

import com.cricketauction.dto.ApiResponse;
import com.cricketauction.dto.BidRuleDto;
import com.cricketauction.service.BidRuleService;
import com.cricketauction.service.OverlayPushService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tournaments/{tournamentId}/bid-rules")
public class BidRuleController {
    private final BidRuleService bidRuleService;
    private final OverlayPushService overlayPushService;

    public BidRuleController(BidRuleService bidRuleService, OverlayPushService overlayPushService) {
        this.bidRuleService = bidRuleService;
        this.overlayPushService = overlayPushService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<BidRuleDto>>> getRules(@PathVariable Long tournamentId) {
        return ResponseEntity.ok(ApiResponse.success(bidRuleService.getRules(tournamentId)));
    }

    @PutMapping
    public ResponseEntity<ApiResponse<List<BidRuleDto>>> replaceRules(@PathVariable Long tournamentId,
                                                                       @RequestBody List<BidRuleDto> rules) {
        List<BidRuleDto> updated = bidRuleService.replaceRules(tournamentId, rules);
        overlayPushService.pushSnapshot(tournamentId);
        return ResponseEntity.ok(ApiResponse.success("Bid rules updated", updated));
    }
}
