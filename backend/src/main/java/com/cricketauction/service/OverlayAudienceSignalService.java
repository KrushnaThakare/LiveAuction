package com.cricketauction.service;

import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class OverlayAudienceSignalService {

    private static final long SIGNAL_TTL_MS = 90_000;

    public record CountdownSignal(long id, int seconds, long triggeredAtMs) {}
    public record TopSoldSignal(long id, long triggeredAtMs) {}

    private final Map<Long, AtomicLong> countdownSeq = new ConcurrentHashMap<>();
    private final Map<Long, CountdownSignal> latestCountdown = new ConcurrentHashMap<>();
    private final Map<Long, AtomicLong> topSoldSeq = new ConcurrentHashMap<>();
    private final Map<Long, TopSoldSignal> latestTopSold = new ConcurrentHashMap<>();

    public CountdownSignal triggerCountdown(Long tournamentId, int seconds) {
        int safeSeconds = Math.max(5, Math.min(15, seconds));
        long id = countdownSeq.computeIfAbsent(tournamentId, ignored -> new AtomicLong(0)).incrementAndGet();
        CountdownSignal signal = new CountdownSignal(id, safeSeconds, System.currentTimeMillis());
        latestCountdown.put(tournamentId, signal);
        return signal;
    }

    public CountdownSignal latestCountdown(Long tournamentId) {
        CountdownSignal signal = latestCountdown.get(tournamentId);
        if (signal == null) return null;
        if (System.currentTimeMillis() - signal.triggeredAtMs() > SIGNAL_TTL_MS) {
            latestCountdown.remove(tournamentId, signal);
            return null;
        }
        return signal;
    }

    public TopSoldSignal triggerTopSold(Long tournamentId) {
        long id = topSoldSeq.computeIfAbsent(tournamentId, ignored -> new AtomicLong(0)).incrementAndGet();
        TopSoldSignal signal = new TopSoldSignal(id, System.currentTimeMillis());
        latestTopSold.put(tournamentId, signal);
        return signal;
    }

    public TopSoldSignal latestTopSold(Long tournamentId) {
        TopSoldSignal signal = latestTopSold.get(tournamentId);
        if (signal == null) return null;
        if (System.currentTimeMillis() - signal.triggeredAtMs() > SIGNAL_TTL_MS) {
            latestTopSold.remove(tournamentId, signal);
            return null;
        }
        return signal;
    }
}
