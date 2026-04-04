package com.webbetting.backend.controller;

import com.webbetting.backend.service.MatchmakingService;
import com.webbetting.backend.service.PvpGameService;
import com.webbetting.backend.service.PvpSettlementService;
import com.webbetting.backend.service.PvpSessionStore;
import com.webbetting.backend.service.ChatService;
import com.webbetting.backend.model.ChatMessage;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Controller;

import java.util.Map;

@Controller
public class GameWebSocketController {

    @Autowired
    private MatchmakingService matchmakingService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private PvpSettlementService pvpSettlementService;

    @Autowired
    private PvpGameService pvpGameService;

    @Autowired
    private ChatService chatService;

    @Data
    public static class ChatRequest {
        private String gameId;
        private String gameType;
        private String senderId;
        private String senderNickname;
        private String opponentId;
        private String content;
    }

    @Data
    public static class TypingRequest {
        private String gameId;
        private String senderId;
        private String senderNickname;
        private String opponentId;
        private boolean typing;
    }

    @Data
    public static class MatchRequest {
        private String userId;
        private String nickname;
        private String gameType;
        private int betAmount;
        private int timeControlMs;
        private int incrementMs;
    }

    @Data
    public static class GameMove {
        private String gameId;
        private String senderId;
        private String opponentId;
        private Object move; // {row,col} for Caro, {from,to,promotion} for Chess
        private String gameType;
        private String newFen; // Chess only - FEN after move (validated client-side, server stores)
    }

    @Data
    public static class GameResultRequest {
        private String gameId;
        private String winnerId;
        private String loserId;
        private String gameType;
        private int betAmount;
        private String reason;
        private String moves;
        private String finalFen;
    }

    @Data
    public static class ReconnectRequest {
        private String gameId;
        private String userId;
    }

    @Data
    public static class DisconnectRequest {
        private String userId;
    }

    @MessageMapping("/game/match")
    public void handleMatchRequest(@Payload MatchRequest request) {
        matchmakingService.addToQueue(
            request.getUserId(),
            request.getNickname(),
            request.getGameType(),
            request.getBetAmount(),
            request.getTimeControlMs(),
            request.getIncrementMs()
        );
    }

    /**
     * Client gửi move lên server.
     * Server validate lượt, cập nhật timer, broadcast state mới cho cả 2.
     */
    @MessageMapping("/game/move")
    public void handleMove(@Payload GameMove move) {
        PvpSessionStore.PvpSession session = pvpGameService.getSession(move.getGameId());
        if (session != null) {
            // Server-authoritative: xử lý qua PvpGameService
            String moveStr = buildMoveString(move);
            pvpGameService.handleMove(move.getGameId(), move.getSenderId(), moveStr, move.getNewFen());
        } else {
            // Fallback: forward trực tiếp (backward compat)
            messagingTemplate.convertAndSend("/topic/move/" + move.getOpponentId(), move);
        }
    }

    /**
     * Client yêu cầu lấy lại state sau khi reconnect.
     */
    @MessageMapping("/game/reconnect")
    public void handleReconnect(@Payload ReconnectRequest req) {
        PvpGameService.GameStatePayload state = pvpGameService.handleReconnect(req.getGameId(), req.getUserId());
        if (state != null) {
            messagingTemplate.convertAndSend("/topic/game-state/" + req.getUserId(), state);
        }
    }

    /**
     * Client thông báo disconnect chủ động (rời phòng).
     */
    @MessageMapping("/game/disconnect")
    public void handleDisconnect(@Payload DisconnectRequest req) {
        pvpGameService.handleDisconnect(req.getUserId());
    }

    @MessageMapping("/game/over")
    public void handleGameOver(@Payload GameResultRequest result) {
        PvpSessionStore.PvpSession session = pvpGameService.getSession(result.getGameId());
        if (session != null) {
            pvpGameService.settleGame(session, result.getWinnerId(), result.getLoserId(), result.getReason());
        } else {
            pvpSettlementService.settleAndBroadcast(result);
        }
    }

    @MessageMapping("/game/cancel-match")
    public void handleCancelMatch(@Payload MatchRequest request) {
        matchmakingService.removeFromQueue(
            request.getUserId(),
            request.getGameType(),
            request.getBetAmount(),
            request.getTimeControlMs(),
            request.getIncrementMs()
        );
    }

    /**
     * Client gửi userId khi connect để server biết session này thuộc user nào.
     * Dùng để xử lý disconnect tự động.
     */
    @MessageMapping("/game/register")
    public void handleRegister(@Payload DisconnectRequest req,
                               org.springframework.messaging.Message<?> message) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);
        Map<String, Object> attrs = accessor.getSessionAttributes();
        if (attrs != null && req.getUserId() != null) {
            attrs.put("userId", req.getUserId());
        }
        // Register = proof of life
        pvpGameService.handlePing(req.getUserId());
    }

    /**
     * Heartbeat từ client - gửi mỗi 15s để server biết user vẫn online.
     * Refresh/back sẽ gửi ping ngay khi WebSocket reconnect.
     */
    @MessageMapping("/game/ping")
    public void handlePing(@Payload DisconnectRequest req) {
        if (req.getUserId() != null) {
            pvpGameService.handlePing(req.getUserId());
        }
    }

    @MessageMapping("/game/chat")
    public void handleChat(@Payload ChatRequest req) {
        if (req.getContent() == null || req.getContent().isBlank()) return;
        String content = req.getContent().trim();
        if (content.length() > 300) content = content.substring(0, 300);

        ChatMessage saved = chatService.saveMessage(
            req.getGameId(), req.getGameType(),
            req.getSenderId(), req.getSenderNickname(), content
        );

        Map<String, Object> payload = Map.of(
            "id", saved.getId(),
            "senderId", saved.getSenderId(),
            "senderNickname", saved.getSenderNickname(),
            "content", saved.getContent(),
            "createdAt", saved.getCreatedAt().toString()
        );

        // Broadcast cho cả 2 player qua topic/chat/{gameId}
        messagingTemplate.convertAndSend("/topic/chat/" + req.getGameId(), payload);
    }

    @MessageMapping("/game/typing")
    public void handleTyping(@Payload TypingRequest req) {
        Map<String, Object> payload = Map.of(
            "senderId", req.getSenderId(),
            "senderNickname", req.getSenderNickname(),
            "typing", req.isTyping()
        );
        // Chỉ gửi cho opponent
        if (req.getOpponentId() != null) {
            messagingTemplate.convertAndSend("/topic/typing/" + req.getGameId(), payload);
        }
    }

    @EventListener
    public void handleWebSocketDisconnect(org.springframework.web.socket.messaging.SessionDisconnectEvent event) {
        // KHÔNG trigger disconnect logic ở đây vì refresh/back cũng gây ra event này.
        // Disconnect thật được detect qua heartbeat timeout (45s không ping).
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        Map<String, Object> attrs = accessor.getSessionAttributes();
        if (attrs == null) return;
        Object userIdObj = attrs.get("userId");
        if (userIdObj != null) {
            // Chỉ log, không xử lý - heartbeat scheduler sẽ handle
            System.out.println("WebSocket disconnected for user: " + userIdObj + " (may be refresh/back)");
        }
    }

    private String buildMoveString(GameMove move) {
        if (move.getMove() == null) return "";
        if (move.getMove() instanceof Map) {
            @SuppressWarnings("unchecked")
            Map<String, Object> m = (Map<String, Object>) move.getMove();
            if (m.containsKey("row")) {
                return m.get("row") + "," + m.get("col");
            } else if (m.containsKey("from")) {
                String uci = m.get("from") + "" + m.get("to");
                if (m.get("promotion") != null) uci += m.get("promotion");
                return uci;
            }
        }
        return move.getMove().toString();
    }
}
