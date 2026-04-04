package com.webbetting.backend.service;

import lombok.AllArgsConstructor;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;

@Service
public class MatchmakingService {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private PvpGameService pvpGameService;

    @Autowired
    private MatchInfoStore matchInfoStore;

    @Autowired
    private com.webbetting.backend.repository.UserRepository userRepository;

    private final Map<String, ConcurrentLinkedQueue<String>> waitingQueues = new ConcurrentHashMap<>();
    private final Map<String, String> userNicknames = new ConcurrentHashMap<>();

    @Data
    @AllArgsConstructor
    public static class MatchResult {
        private String gameId;
        private String opponentId;
        private String opponentNickname;
        private String role;
        private String gameType;
        private int betAmount;
        private int timeControlMs;
        private int incrementMs;
    }

    @Transactional
    public synchronized void addToQueue(String userId, String nickname, String gameType, int betAmount, int timeControlMs, int incrementMs) {
        if (userId == null || nickname == null || gameType == null) return;

        System.out.println("🔍 Matchmaking Request: User=" + userId + ", Game=" + gameType + ", Bet=" + betAmount);
        userNicknames.put(userId, nickname);

        String queueKey = gameType + "_" + betAmount + "_" + timeControlMs + "_" + incrementMs;
        ConcurrentLinkedQueue<String> queue = waitingQueues.computeIfAbsent(queueKey, k -> new ConcurrentLinkedQueue<>());

        if (queue.contains(userId)) {
            System.out.println("⚠️ User " + userId + " is already in queue " + queueKey);
            return;
        }

        String opponentId = queue.poll();

        if (opponentId != null && !opponentId.equals(userId)) {
            // ✅ Kiểm tra và trừ tiền cả 2 ngay khi match found
            Long p1Id = parseLong(userId);
            Long p2Id = parseLong(opponentId);
            if (p1Id == null || p2Id == null) { queue.add(opponentId); return; }

            com.webbetting.backend.model.User u1 = userRepository.findById(p1Id).orElse(null);
            com.webbetting.backend.model.User u2 = userRepository.findById(p2Id).orElse(null);
            if (u1 == null || u2 == null) { queue.add(opponentId); return; }

            long b1 = u1.getBalance() != null ? u1.getBalance() : 0L;
            long b2 = u2.getBalance() != null ? u2.getBalance() : 0L;

            // Kiểm tra đủ tiền
            if (b1 < betAmount) {
                System.out.println("❌ User " + userId + " không đủ tiền cược");
                queue.add(opponentId); // trả opponent về queue
                // Thông báo lỗi về cho user không đủ tiền
                messagingTemplate.convertAndSend("/topic/match/" + userId,
                    new MatchResult("ERROR_INSUFFICIENT_BALANCE", null, null, null, gameType, betAmount, timeControlMs, incrementMs));
                return;
            }
            if (b2 < betAmount) {
                System.out.println("❌ User " + opponentId + " không đủ tiền cược");
                queue.add(opponentId);
                // Thông báo lỗi về cho opponent không đủ tiền
                messagingTemplate.convertAndSend("/topic/match/" + opponentId,
                    new MatchResult("ERROR_INSUFFICIENT_BALANCE", null, null, null, gameType, betAmount, timeControlMs, incrementMs));
                // Trả user hiện tại vào queue để tìm người khác
                queue.add(userId);
                return;
            }

            // Trừ tiền cả 2
            u1.setBalance(b1 - betAmount);
            u2.setBalance(b2 - betAmount);
            userRepository.save(u1);
            userRepository.save(u2);
            System.out.println("💰 Đã trừ " + betAmount + " từ cả 2 người chơi khi bắt đầu trận");

            String gameId = UUID.randomUUID().toString();
            System.out.println("🎯 MATCH FOUND! " + userId + " vs " + opponentId + " [Game: " + gameType + "]");

            matchInfoStore.put(gameId, new MatchInfoStore.MatchInfo(
                    gameId, gameType, betAmount, timeControlMs, incrementMs,
                    userId, opponentId, nickname, userNicknames.get(opponentId)
            ));

            pvpGameService.createSession(
                    gameId, gameType,
                    userId, nickname,
                    opponentId, userNicknames.get(opponentId),
                    betAmount, timeControlMs, incrementMs
            );

            messagingTemplate.convertAndSend("/topic/match/" + userId,
                new MatchResult(gameId, opponentId, userNicknames.get(opponentId), "PLAYER_1", gameType, betAmount, timeControlMs, incrementMs));
            messagingTemplate.convertAndSend("/topic/match/" + opponentId,
                new MatchResult(gameId, userId, nickname, "PLAYER_2", gameType, betAmount, timeControlMs, incrementMs));
        } else {
            queue.add(userId);
            System.out.println("📥 User " + userId + " added to queue. Current queue size: " + queue.size());
        }
    }

    private Long parseLong(String v) {
        try { return v == null ? null : Long.parseLong(v); } catch (Exception e) { return null; }
    }

    public synchronized void removeFromQueue(String userId, String gameType, int betAmount, int timeControlMs, int incrementMs) {
        if (userId == null || gameType == null) return;
        String queueKey = gameType + "_" + betAmount + "_" + timeControlMs + "_" + incrementMs;
        ConcurrentLinkedQueue<String> queue = waitingQueues.get(queueKey);
        if (queue != null) {
            queue.remove(userId);
            System.out.println("User " + userId + " removed from " + gameType + " queue");
        }
        // Không cần hoàn tiền vì chưa trừ (chỉ trừ khi match found)
    }

    public int getQueueSize(String gameType, int betAmount, int timeControlMs, int incrementMs) {
        String queueKey = gameType + "_" + betAmount + "_" + timeControlMs + "_" + incrementMs;
        ConcurrentLinkedQueue<String> queue = waitingQueues.get(queueKey);
        return queue != null ? queue.size() : 0;
    }

    // Delegate sang MatchInfoStore để backward compat với PvpSettlementService
    public MatchInfoStore.MatchInfo getMatchInfo(String gameId) {
        return matchInfoStore.get(gameId);
    }

    public void removeMatchInfo(String gameId) {
        matchInfoStore.remove(gameId);
    }
}
