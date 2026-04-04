package com.webbetting.backend.service;

import lombok.AllArgsConstructor;
import lombok.Data;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Tách riêng store MatchInfo để tránh circular dependency:
 * MatchmakingService → PvpGameService → PvpSettlementService → MatchmakingService
 */
@Component
public class MatchInfoStore {

    @Data
    @AllArgsConstructor
    public static class MatchInfo {
        private String gameId;
        private String gameType;
        private int betAmount;
        private int timeControlMs;
        private int incrementMs;
        private String player1Id;
        private String player2Id;
        private String player1Nickname;
        private String player2Nickname;
    }

    private final Map<String, MatchInfo> matchInfos = new ConcurrentHashMap<>();

    public void put(String gameId, MatchInfo info) {
        matchInfos.put(gameId, info);
    }

    public MatchInfo get(String gameId) {
        return gameId == null ? null : matchInfos.get(gameId);
    }

    public void remove(String gameId) {
        if (gameId != null) matchInfos.remove(gameId);
    }
}
