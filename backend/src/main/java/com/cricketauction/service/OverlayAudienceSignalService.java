package com.cricketauction.service;

import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class OverlayAudienceSignalService {

    private static final long COUNTDOWN_TTL_MS = 90_000;

    public record CountdownSignal(long id, int seconds, long triggeredAtMs) {}

    private final Map<Long, AtomicLong> countdownSeq = new ConcurrentHashMap<>();
    private final Map<Long, CountdownSignal> latestCountdown = new ConcurrentHashMap<>();

    public CountdownSignal triggerCountdown(Long tournamentId, int seconds) {
        int safeSeconds = Math.max(5, Math.min(15, seconds));
        long id = countdownSeq.computeIfAbsent(tournamentId, ignored -> new AtomicLong(0)).incrementAndGet();
        CountdownSignal signal = new CountdownSignal(id, safeSeconds, System.currentTimeMillis());
        latestCountdown.put(tournamentId, signal);
        return signal;
    }

    /** Returns the latest countdown only while it is still "live" (recent trigger). */
    public CountdownSignal latestCountdown(Long tournamentId) {
        CountdownSignal signal = latestCountdown.get(tournamentId);
        if (signal == null) return null;
        if (System.currentTimeMillis() - signal.triggeredAtMs() > COUNTDOWN_TTL_MS) {
            latestCountdown.remove(tournamentId, signal);
            return null;
        }
        return signal;
    }
}
