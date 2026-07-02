package com.cricketauction.service;

import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class OverlayAudienceSignalService {

    public record CountdownSignal(long id, int seconds) {}

    private final Map<Long, AtomicLong> countdownSeq = new ConcurrentHashMap<>();
    private final Map<Long, CountdownSignal> latestCountdown = new ConcurrentHashMap<>();

    public CountdownSignal triggerCountdown(Long tournamentId, int seconds) {
        int safeSeconds = Math.max(5, Math.min(15, seconds));
        long id = countdownSeq.computeIfAbsent(tournamentId, ignored -> new AtomicLong(0)).incrementAndGet();
        CountdownSignal signal = new CountdownSignal(id, safeSeconds);
        latestCountdown.put(tournamentId, signal);
        return signal;
    }

    public CountdownSignal latestCountdown(Long tournamentId) {
        return latestCountdown.get(tournamentId);
    }
}
