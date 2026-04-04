package com.webbetting.backend.service;

import lombok.Data;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class PvpSessionStore {

    private final Map<String, PvpSession> sessions = new ConcurrentHashMap<>();

    @Data
    public static class PvpSession {
        private String gameId;
        private String gameType;
        private String player1Id;
        private String player2Id;
        private String player1Nickname;
        private String player2Nickname;
        private int betAmount;
        private int timeControlMs;
        private int incrementMs;

        private String status; // "IN_PROGRESS" | "FINISHED" | "DISCONNECTED"
        private String currentTurn;
        private String moves;
        private String fen;
        private int moveCount;

        // Timer - server authoritative
        // timePlayer1Ms / timePlayer2Ms lưu remaining time TẠI THỜI ĐIỂM lastMoveTimestamp
        // Remaining thực tế = saved - (now - lastMoveTimestamp) nếu đang là lượt của player đó
        private long timePlayer1Ms;
        private long timePlayer2Ms;
        private long lastMoveTimestamp;

        // Disconnect handling
        private String disconnectedPlayerId;
        private long disconnectTimestamp;

        // Heartbeat: track lần cuối mỗi player ping
        private long lastPingPlayer1;
        private long lastPingPlayer2;

        // Grace period: 60s để reconnect (đủ cho reload chậm)
        public static final long RECONNECT_GRACE_MS = 60_000;
        // Heartbeat timeout: nếu không ping trong 45s thì coi là disconnect
        private static final long HEARTBEAT_TIMEOUT_MS = 45_000;

        public boolean isDisconnectExpired() {
            if (disconnectedPlayerId == null) return false;
            return System.currentTimeMillis() - disconnectTimestamp > RECONNECT_GRACE_MS;
        }

        /**
         * Tính remaining time thực tế cho player, trừ elapsed kể từ lastMoveTimestamp.
         */
        public long getRemainingTimeMs(String playerId) {
            long saved = playerId.equals(player1Id) ? timePlayer1Ms : timePlayer2Ms;
            if (playerId.equals(currentTurn) && "IN_PROGRESS".equals(status) && lastMoveTimestamp > 0) {
                long elapsed = System.currentTimeMillis() - lastMoveTimestamp;
                return Math.max(0, saved - elapsed);
            }
            return saved;
        }

        /**
         * Khi có move: trừ elapsed vào người vừa đi, cộng increment, chuyển lượt.
         */
        public void onMoveMade(String moverId) {
            long elapsed = lastMoveTimestamp > 0 ? System.currentTimeMillis() - lastMoveTimestamp : 0;
            if (moverId.equals(player1Id)) {
                timePlayer1Ms = Math.max(0, timePlayer1Ms - elapsed) + incrementMs;
            } else {
                timePlayer2Ms = Math.max(0, timePlayer2Ms - elapsed) + incrementMs;
            }
            lastMoveTimestamp = System.currentTimeMillis();
            currentTurn = moverId.equals(player1Id) ? player2Id : player1Id;
            moveCount++;
        }

        /**
         * Khi reconnect: KHÔNG reset lastMoveTimestamp.
         * Timer tiếp tục chạy từ lúc disconnect - thời gian offline bị trừ.
         */
        public void onReconnect(String userId) {
            if (userId.equals(disconnectedPlayerId)) {
                status = "IN_PROGRESS";
                disconnectedPlayerId = null;
                disconnectTimestamp = 0;
                // KHÔNG set lastMoveTimestamp - để timer tiếp tục tính đúng
            }
        }

        public void updatePing(String userId) {
            long now = System.currentTimeMillis();
            if (userId.equals(player1Id)) lastPingPlayer1 = now;
            else if (userId.equals(player2Id)) lastPingPlayer2 = now;
        }

        public boolean isPlayerOnline(String userId) {
            long now = System.currentTimeMillis();
            long lastPing = userId.equals(player1Id) ? lastPingPlayer1 : lastPingPlayer2;
            return (now - lastPing) < HEARTBEAT_TIMEOUT_MS;
        }
    }

    public void put(String gameId, PvpSession session) { sessions.put(gameId, session); }
    public PvpSession get(String gameId) { return sessions.get(gameId); }
    public void remove(String gameId) { sessions.remove(gameId); }
    public boolean exists(String gameId) { return sessions.containsKey(gameId); }
    public Map<String, PvpSession> all() { return sessions; }

    public PvpSession findActiveByUserId(String userId) {
        if (userId == null) return null;
        for (PvpSession s : sessions.values()) {
            if ("FINISHED".equals(s.getStatus())) continue;
            if (userId.equals(s.getPlayer1Id()) || userId.equals(s.getPlayer2Id())) return s;
        }
        return null;
    }
}
