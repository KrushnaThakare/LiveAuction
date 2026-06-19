package com.cricketauction.service;

import com.cricketauction.dto.AuctionStateResponse;
import com.cricketauction.dto.TeamResponse;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Short-lived in-memory cache for public overlay snapshot reads.
 * Prevents hundreds of concurrent /overlay/.../snapshot polls from exhausting the DB pool.
 */
@Service
public class OverlaySnapshotService {

    private static final long SNAPSHOT_TTL_MS = 2_000L;

    private final AuctionService auctionService;
    private final TeamService teamService;

    private final ConcurrentHashMap<String, SnapshotEntry> snapshotCache = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Object> snapshotLocks = new ConcurrentHashMap<>();

    public OverlaySnapshotService(AuctionService auctionService, TeamService teamService) {
        this.auctionService = auctionService;
        this.teamService = teamService;
    }

    public Map<String, Object> getSnapshot(Long tournamentId, boolean includePlayers) {
        String key = snapshotKey(tournamentId, includePlayers);
        long now = System.currentTimeMillis();

        SnapshotEntry cached = snapshotCache.get(key);
        if (cached != null && cached.expiresAtMs > now) {
            return cached.payload;
        }

        synchronized (lockFor(key)) {
            cached = snapshotCache.get(key);
            if (cached != null && cached.expiresAtMs > System.currentTimeMillis()) {
                return cached.payload;
            }
            AuctionStateResponse auction = auctionService.getAuctionState(tournamentId);
            return cacheSnapshot(tournamentId, includePlayers, auction);
        }
    }

    public Map<String, Object> cacheSnapshot(Long tournamentId, boolean includePlayers, AuctionStateResponse auction) {
        List<TeamResponse> teams = includePlayers
                ? teamService.getTeamsByTournament(tournamentId)
                : teamService.getTeamSummariesByTournament(tournamentId);
        Map<String, Object> payload = new HashMap<>(2);
        payload.put("auction", auction);
        payload.put("teams", teams);
        snapshotCache.put(snapshotKey(tournamentId, includePlayers),
                new SnapshotEntry(payload, System.currentTimeMillis() + SNAPSHOT_TTL_MS));
        return payload;
    }

    public void invalidate(Long tournamentId) {
        String prefix = tournamentId + ":";
        snapshotCache.keySet().removeIf(key -> key.startsWith(prefix));
    }

    private static String snapshotKey(Long tournamentId, boolean includePlayers) {
        return tournamentId + ":" + includePlayers;
    }

    private Object lockFor(String key) {
        return snapshotLocks.computeIfAbsent(key, ignored -> new Object());
    }

    private record SnapshotEntry(Map<String, Object> payload, long expiresAtMs) {}
}
