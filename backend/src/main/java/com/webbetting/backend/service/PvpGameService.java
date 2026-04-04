package com.webbetting.backend.service;

import com.webbetting.backend.controller.GameWebSocketController;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class PvpGameService {

    @Autowired private PvpSessionStore sessionStore;
    @Autowired private SimpMessagingTemplate messagingTemplate;
    @Autowired private PvpSettlementService settlementService;

    @Data
    public static class GameStatePayload {
        private String gameId;
        private String gameType;
        private String status;
        private String currentTurn;
        private String moves;
        private String fen;
        private int moveCount;
        private long timePlayer1Ms;
        private long timePlayer2Ms;
        private long serverTimestamp;
        private String player1Id;
        private String player2Id;
        private String lastMoveBy;
        private String disconnectedPlayerId;
        private long disconnectTimestamp;
        private long lastMoveTimestamp;
        private long reconnectRemainingMs; // countdown để B biết còn bao nhiêu giây
    }

    public PvpSessionStore.PvpSession createSession(
            String gameId, String gameType,
            String p1Id, String p1Nick,
            String p2Id, String p2Nick,
            int betAmount, int timeControlMs, int incrementMs) {

        PvpSessionStore.PvpSession s = new PvpSessionStore.PvpSession();
        s.setGameId(gameId);
        s.setGameType(gameType.toUpperCase());
        s.setPlayer1Id(p1Id);
        s.setPlayer2Id(p2Id);
        s.setPlayer1Nickname(p1Nick);
        s.setPlayer2Nickname(p2Nick);
        s.setBetAmount(betAmount);
        s.setTimeControlMs(timeControlMs);
        s.setIncrementMs(incrementMs);
        s.setStatus("IN_PROGRESS");
        s.setCurrentTurn(p1Id);
        s.setMoves("");
        s.setFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
        s.setMoveCount(0);
        long tc = timeControlMs > 0 ? timeControlMs : Long.MAX_VALUE / 2;
        s.setTimePlayer1Ms(tc);
        s.setTimePlayer2Ms(tc);
        s.setLastMoveTimestamp(System.currentTimeMillis());
        long now = System.currentTimeMillis();
        s.setLastPingPlayer1(now);
        s.setLastPingPlayer2(now);
        sessionStore.put(gameId, s);
        return s;
    }

    public void handleMove(String gameId, String senderId, Object moveData, String newFen) {
        PvpSessionStore.PvpSession s = sessionStore.get(gameId);
        if (s == null || !"IN_PROGRESS".equals(s.getStatus())) return;
        if (!senderId.equals(s.getCurrentTurn())) return;

        s.onMoveMade(senderId);
        s.updatePing(senderId); // move = proof of life

        String moveStr = moveData.toString();
        if (s.getMoves() == null || s.getMoves().isEmpty()) {
            s.setMoves(moveStr);
        } else {
            s.setMoves(s.getMoves() + ("CARO".equals(s.getGameType()) ? ";" : " ") + moveStr);
        }

        if (newFen != null && !newFen.isEmpty()) s.setFen(newFen);

        broadcastToPlayers(s, buildPayload(s, senderId));
    }

    /**
     * Heartbeat từ client - chứng minh user vẫn online.
     * Refresh/back sẽ gửi ping ngay khi reconnect.
     */
    public void handlePing(String userId) {
        PvpSessionStore.PvpSession s = sessionStore.findActiveByUserId(userId);
        if (s == null) return;
        s.updatePing(userId);

        // Nếu đang DISCONNECTED và user này ping lại → resume
        if ("DISCONNECTED".equals(s.getStatus()) && userId.equals(s.getDisconnectedPlayerId())) {
            s.onReconnect(userId);
            String opponentId = userId.equals(s.getPlayer1Id()) ? s.getPlayer2Id() : s.getPlayer1Id();
            GameStatePayload payload = buildPayload(s, null);
            messagingTemplate.convertAndSend("/topic/game-state/" + opponentId, payload);
            messagingTemplate.convertAndSend("/topic/game-state/" + userId, payload);
        }
    }

    /**
     * Chỉ gọi khi user chủ động resign (bấm "Rời phòng").
     * KHÔNG gọi khi refresh/back.
     */
    public void handleDisconnect(String userId) {
        PvpSessionStore.PvpSession s = sessionStore.findActiveByUserId(userId);
        if (s == null || !"IN_PROGRESS".equals(s.getStatus())) return;

        s.setDisconnectedPlayerId(userId);
        s.setDisconnectTimestamp(System.currentTimeMillis());
        s.setStatus("DISCONNECTED");

        String opponentId = userId.equals(s.getPlayer1Id()) ? s.getPlayer2Id() : s.getPlayer1Id();
        GameStatePayload payload = buildPayload(s, null);
        messagingTemplate.convertAndSend("/topic/game-state/" + opponentId, payload);
        messagingTemplate.convertAndSend("/topic/game-state/" + userId, payload);
    }

    /**
     * Reconnect qua REST API - trả lại full state.
     * KHÔNG reset lastMoveTimestamp để timer tiếp tục đúng.
     */
    public GameStatePayload handleReconnect(String gameId, String userId) {
        PvpSessionStore.PvpSession s = sessionStore.get(gameId);
        if (s == null) return null;

        s.updatePing(userId);

        if ("DISCONNECTED".equals(s.getStatus()) && userId.equals(s.getDisconnectedPlayerId())) {
            s.onReconnect(userId); // KHÔNG reset lastMoveTimestamp
            String opponentId = userId.equals(s.getPlayer1Id()) ? s.getPlayer2Id() : s.getPlayer1Id();
            messagingTemplate.convertAndSend("/topic/game-state/" + opponentId, buildPayload(s, null));
        }

        return buildPayload(s, null);
    }

    /**
     * Scheduled mỗi 10s: kiểm tra heartbeat timeout và timer timeout.
     */
    @Scheduled(fixedDelay = 10_000)
    public void checkTimeouts() {
        long now = System.currentTimeMillis();
        for (Map.Entry<String, PvpSessionStore.PvpSession> entry : sessionStore.all().entrySet()) {
            PvpSessionStore.PvpSession s = entry.getValue();

            if ("DISCONNECTED".equals(s.getStatus()) && s.isDisconnectExpired()) {
                String loser = s.getDisconnectedPlayerId();
                String winner = loser.equals(s.getPlayer1Id()) ? s.getPlayer2Id() : s.getPlayer1Id();
                settleGame(s, winner, loser, "disconnect_timeout");
                continue;
            }

            if (!"IN_PROGRESS".equals(s.getStatus())) continue;

            // Heartbeat check
            for (String playerId : new String[]{s.getPlayer1Id(), s.getPlayer2Id()}) {
                if (!s.isPlayerOnline(playerId) && s.getDisconnectedPlayerId() == null) {
                    s.setDisconnectedPlayerId(playerId);
                    s.setDisconnectTimestamp(now);
                    s.setStatus("DISCONNECTED");
                    String opponentId = playerId.equals(s.getPlayer1Id()) ? s.getPlayer2Id() : s.getPlayer1Id();
                    GameStatePayload payload = buildPayload(s, null);
                    messagingTemplate.convertAndSend("/topic/game-state/" + opponentId, payload);
                    messagingTemplate.convertAndSend("/topic/game-state/" + playerId, payload);
                    break;
                }
            }

            // Timer timeout - kiểm tra luật    Chess
            if (s.getTimeControlMs() <= 0) continue;
            String currentTurn = s.getCurrentTurn();
            if (s.getRemainingTimeMs(currentTurn) <= 0) {
                String loser = currentTurn;
                String winner = loser.equals(s.getPlayer1Id()) ? s.getPlayer2Id() : s.getPlayer1Id();
                if ("CHESS".equals(s.getGameType())) {
                    // Kiểm tra đối thủ có đủ quân checkmate không
                    boolean canCheckmate = canOpponentCheckmate(s.getFen(), winner);
                    if (!canCheckmate) {
                        // Hòa vì đối thủ không đủ quân
                        settleGame(s, "draw", "draw", "timeout_insufficient_material");
                    } else {
                        settleGame(s, winner, loser, "timeout");
                    }
                } else {
                    settleGame(s, winner, loser, "timeout");
                }
            }
        }
    }

    /**
     * Broadcast timer mỗi 1s cho tất cả game đang active.
     * Khi DISCONNECTED: broadcast countdown để B biết còn bao nhiêu giây.
     */
    @Scheduled(fixedDelay = 1_000)
    public void broadcastTimers() {
        for (PvpSessionStore.PvpSession s : sessionStore.all().values()) {
            if ("FINISHED".equals(s.getStatus())) continue;
            if (s.getTimeControlMs() <= 0 && !"DISCONNECTED".equals(s.getStatus())) continue;
            GameStatePayload payload = buildPayload(s, null);
            messagingTemplate.convertAndSend("/topic/game-state/" + s.getPlayer1Id(), payload);
            messagingTemplate.convertAndSend("/topic/game-state/" + s.getPlayer2Id(), payload);
        }
    }

    public void settleGame(PvpSessionStore.PvpSession s, String winnerId, String loserId, String reason) {
        if (!"IN_PROGRESS".equals(s.getStatus()) && !"DISCONNECTED".equals(s.getStatus())) return;
        s.setStatus("FINISHED");

        // Normalize draw
        boolean isDraw = "draw".equalsIgnoreCase(winnerId);

        GameWebSocketController.GameResultRequest req = new GameWebSocketController.GameResultRequest();
        req.setGameId(s.getGameId());
        req.setWinnerId(isDraw ? "draw" : winnerId);
        req.setLoserId(isDraw ? "draw" : loserId);
        req.setGameType(s.getGameType());
        req.setBetAmount(s.getBetAmount());
        req.setReason(reason);
        req.setMoves(s.getMoves());
        req.setFinalFen(s.getFen());

        settlementService.settleAndBroadcast(req);
        sessionStore.remove(s.getGameId());
    }

    public GameStatePayload buildPayload(PvpSessionStore.PvpSession s, String lastMoveBy) {
        GameStatePayload p = new GameStatePayload();
        p.setGameId(s.getGameId());
        p.setGameType(s.getGameType());
        p.setStatus(s.getStatus());
        p.setCurrentTurn(s.getCurrentTurn());
        p.setMoves(s.getMoves());
        p.setFen(s.getFen());
        p.setMoveCount(s.getMoveCount());
        // Tính remaining time thực tế tại thời điểm này
        p.setTimePlayer1Ms(s.getRemainingTimeMs(s.getPlayer1Id()));
        p.setTimePlayer2Ms(s.getRemainingTimeMs(s.getPlayer2Id()));
        p.setServerTimestamp(System.currentTimeMillis());
        p.setLastMoveTimestamp(s.getLastMoveTimestamp());
        p.setPlayer1Id(s.getPlayer1Id());
        p.setPlayer2Id(s.getPlayer2Id());
        p.setLastMoveBy(lastMoveBy);
        p.setDisconnectedPlayerId(s.getDisconnectedPlayerId());
        p.setDisconnectTimestamp(s.getDisconnectTimestamp());
        // Tính countdown reconnect còn lại
        if ("DISCONNECTED".equals(s.getStatus()) && s.getDisconnectTimestamp() > 0) {
            long elapsed = System.currentTimeMillis() - s.getDisconnectTimestamp();
            p.setReconnectRemainingMs(Math.max(0, PvpSessionStore.PvpSession.RECONNECT_GRACE_MS - elapsed));
        }
        return p;
    }

    private void broadcastToPlayers(PvpSessionStore.PvpSession s, GameStatePayload payload) {
        messagingTemplate.convertAndSend("/topic/game-state/" + s.getPlayer1Id(), payload);
        messagingTemplate.convertAndSend("/topic/game-state/" + s.getPlayer2Id(), payload);
    }

    /**
     * Kiểm tra đối thủ (winner) có đủ quân để checkmate không.
     * Dựa trên FEN - chỉ xét quân của winner.
     * Không thể checkmate nếu chỉ còn: K, K+B, K+N
     */
    private boolean canOpponentCheckmate(String fen, String winnerId) {
        if (fen == null || fen.isEmpty()) return true; // mặc định có thể
        try {
            // FEN format: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
            String boardPart = fen.split(" ")[0];
            // Xác định màu của winner dựa trên FEN side-to-move
            // currentTurn là loser, nên winner là bên còn lại
            String sideToMove = fen.split(" ").length > 1 ? fen.split(" ")[1] : "w";
            // loser đang đến lượt → winner là bên kia
            boolean winnerIsWhite = "b".equals(sideToMove); // loser là w → winner là b, ngược lại

            // Đếm quân của winner
            int queens = 0, rooks = 0, bishops = 0, knights = 0, pawns = 0;
            for (char c : boardPart.toCharArray()) {
                if (winnerIsWhite) {
                    if (c == 'Q') queens++;
                    else if (c == 'R') rooks++;
                    else if (c == 'B') bishops++;
                    else if (c == 'N') knights++;
                    else if (c == 'P') pawns++;
                } else {
                    if (c == 'q') queens++;
                    else if (c == 'r') rooks++;
                    else if (c == 'b') bishops++;
                    else if (c == 'n') knights++;
                    else if (c == 'p') pawns++;
                }
            }

            // Không thể checkmate: K only, K+B, K+N
            if (queens == 0 && rooks == 0 && pawns == 0) {
                if (bishops == 0 && knights == 0) return false; // chỉ K
                if (bishops == 1 && knights == 0) return false; // K+B
                if (bishops == 0 && knights == 1) return false; // K+N
            }
            return true;
        } catch (Exception e) {
            return true; // lỗi parse → mặc định có thể checkmate
        }
    }

    public PvpSessionStore.PvpSession getSession(String gameId) {
        return sessionStore.get(gameId);
    }
}
