package com.cricketauction.service;

import com.cricketauction.dto.TopSoldPlayerResponse;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Pre-computed top-5 sold list per tournament. Refreshed on sell/undo only.
 * Break overlay reads this cache — no work during live bidding.
 */
@Service
public class TopSoldCacheService {

    private final Map<Long, List<TopSoldPlayerResponse>> cache = new ConcurrentHashMap<>();
    private final PlayerService playerService;

    public TopSoldCacheService(PlayerService playerService) {
        this.playerService = playerService;
    }

    public List<TopSoldPlayerResponse> getCached(Long tournamentId) {
        return cache.getOrDefault(tournamentId, Collections.emptyList());
    }

    public List<TopSoldPlayerResponse> refresh(Long tournamentId) {
        List<TopSoldPlayerResponse> list = playerService.getTopSoldPlayers(tournamentId, 5);
        cache.put(tournamentId, list);
        return list;
    }

    public List<TopSoldPlayerResponse> getOrRefresh(Long tournamentId) {
        List<TopSoldPlayerResponse> cached = cache.get(tournamentId);
        if (cached != null) return cached;
        return refresh(tournamentId);
    }
}
