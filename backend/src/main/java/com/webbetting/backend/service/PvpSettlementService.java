package com.webbetting.backend.service;

import com.webbetting.backend.controller.GameWebSocketController;
import com.webbetting.backend.model.CaroGame;
import com.webbetting.backend.model.ChessGame;
import com.webbetting.backend.model.TransactionType;
import com.webbetting.backend.model.User;
import com.webbetting.backend.repository.CaroGameRepository;
import com.webbetting.backend.repository.ChessGameRepository;
import com.webbetting.backend.repository.UserRepository;
import lombok.AllArgsConstructor;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class PvpSettlementService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CaroGameRepository caroGameRepository;

    @Autowired
    private ChessGameRepository chessGameRepository;

    @Autowired
    private MatchInfoStore matchInfoStore;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private TransactionService transactionService;

    private final Map<String, Boolean> settled = new ConcurrentHashMap<>();

    @Data
    @AllArgsConstructor
    public static class GameOverEvent {
        private String gameId;
        private String gameType;
        private int betAmount;
        private String winnerId;
        private String loserId;
        private String reason;
        private String result;
        private long myBalanceAfter;
    }

    @Transactional
    public void settleAndBroadcast(GameWebSocketController.GameResultRequest req) {
        if (req == null || req.getGameId() == null) return;
        if (settled.putIfAbsent(req.getGameId(), true) != null) return;

        MatchInfoStore.MatchInfo info = matchInfoStore.get(req.getGameId());
        if (info == null) return;

        Long p1 = parseLong(info.getPlayer1Id());
        Long p2 = parseLong(info.getPlayer2Id());
        if (p1 == null || p2 == null) return;

        User u1 = userRepository.findById(p1).orElse(null);
        User u2 = userRepository.findById(p2).orElse(null);
        if (u1 == null || u2 == null) return;

        long b1Before = u1.getBalance() != null ? u1.getBalance() : 0L;
        long b2Before = u2.getBalance() != null ? u2.getBalance() : 0L;

        String winnerId = String.valueOf(req.getWinnerId());
        String loserId = String.valueOf(req.getLoserId());

        int bet = info.getBetAmount();
        String gameType = String.valueOf(info.getGameType()).toUpperCase();

        // ✅ Tiền đã bị trừ lúc bắt đầu trận.
        // Khi kết thúc: chỉ cộng cho người thắng (bet * 2 = tiền của mình + tiền đối thủ)
        // Hòa: hoàn lại bet cho mỗi người
        if ("CHESS".equals(gameType) || "CARO".equals(gameType)) {
            if ("draw".equalsIgnoreCase(winnerId)) {
                // Hòa: hoàn lại tiền cược cho cả 2
                u1.setBalance(b1Before + bet);
                u2.setBalance(b2Before + bet);
                transactionService.createTransaction(u1, TransactionType.WIN, (long) bet, b1Before, u1.getBalance());
                transactionService.createTransaction(u2, TransactionType.WIN, (long) bet, b2Before, u2.getBalance());
            } else {
                // Có người thắng: người thắng nhận bet*2 (tiền của mình + tiền đối thủ)
                if (winnerId.equals(String.valueOf(u1.getId()))) {
                    u1.setBalance(b1Before + (long) bet * 2L);
                    transactionService.createTransaction(u1, TransactionType.WIN, (long) bet * 2, b1Before, u1.getBalance());
                    transactionService.createTransaction(u2, TransactionType.BET, (long) bet, b2Before, u2.getBalance());
                    // u2 không thay đổi (đã bị trừ từ đầu)
                } else if (winnerId.equals(String.valueOf(u2.getId()))) {
                    u2.setBalance(b2Before + (long) bet * 2L);
                    transactionService.createTransaction(u2, TransactionType.WIN, (long) bet * 2, b2Before, u2.getBalance());
                    transactionService.createTransaction(u1, TransactionType.BET, (long) bet, b1Before, u1.getBalance());
                    // u1 không thay đổi
                }
            }
        }

        userRepository.save(u1);
        userRepository.save(u2);

        LocalDateTime finishedAt = LocalDateTime.now();

        if ("CARO".equals(gameType)) {
            saveCaroRecord(u1, info, req, finishedAt, b1Before, u1.getBalance());
            saveCaroRecord(u2, info, req, finishedAt, b2Before, u2.getBalance());
        } else if ("CHESS".equals(gameType)) {
            saveChessRecord(u1, info, req, finishedAt, b1Before, u1.getBalance());
            saveChessRecord(u2, info, req, finishedAt, b2Before, u2.getBalance());
        }

        String r1 = resultForUser(String.valueOf(u1.getId()), winnerId);
        String r2 = resultForUser(String.valueOf(u2.getId()), winnerId);

        messagingTemplate.convertAndSend(
                "/topic/game-over/" + u1.getId(),
                new GameOverEvent(req.getGameId(), gameType, bet, winnerId, loserId, req.getReason(), r1, u1.getBalance())
        );
        messagingTemplate.convertAndSend(
                "/topic/game-over/" + u2.getId(),
                new GameOverEvent(req.getGameId(), gameType, bet, winnerId, loserId, req.getReason(), r2, u2.getBalance())
        );

        matchInfoStore.remove(req.getGameId());
    }

    private void saveCaroRecord(User user, MatchInfoStore.MatchInfo info, GameWebSocketController.GameResultRequest req,
                                LocalDateTime finishedAt, long balanceBefore, long balanceAfter) {
        CaroGame g = new CaroGame();
        g.setUser(user);
        g.setOpponentType("PVP");
        g.setDifficulty("PVP");
        g.setBoardSize(50);
        String result = resultForUser(String.valueOf(user.getId()), String.valueOf(req.getWinnerId()));
        g.setGameResult(result);
        // Lưu tên đối thủ
        String opponentNick = String.valueOf(user.getId()).equals(info.getPlayer1Id())
                ? info.getPlayer2Nickname() : info.getPlayer1Nickname();
        g.setOpponentNickname(opponentNick);
        if ("WIN".equals(result)) {
            g.setUserScore(1);
            g.setOpponentScore(0);
            g.setWinAmount(info.getBetAmount() * 2);
        } else if ("DRAW".equals(result)) {
            g.setUserScore(0);
            g.setOpponentScore(0);
            g.setWinAmount(0);
        } else {
            g.setUserScore(0);
            g.setOpponentScore(1);
            g.setWinAmount(0);
        }
        g.setBetAmount(info.getBetAmount());
        g.setGameMoves(req.getMoves());
        g.setCreatedAt(finishedAt);
        g.setFinishedAt(finishedAt);
        g.setBalanceBefore(balanceBefore);
        g.setBalanceAfter(balanceAfter);
        caroGameRepository.save(g);
    }

    private void saveChessRecord(User user, MatchInfoStore.MatchInfo info, GameWebSocketController.GameResultRequest req,
                                 LocalDateTime finishedAt, long balanceBefore, long balanceAfter) {
        ChessGame g = new ChessGame();
        g.setUser(user);
        g.setDifficulty("PVP");
        String color = String.valueOf(user.getId()).equals(info.getPlayer1Id()) ? "WHITE" : "BLACK";
        g.setPlayerColor(color);
        g.setStakeAmount((long) info.getBetAmount());
        g.setStatus("FINISHED");
        String result = resultForUser(String.valueOf(user.getId()), String.valueOf(req.getWinnerId()));
        g.setGameResult(result);
        // Lưu tên đối thủ
        String opponentNick = String.valueOf(user.getId()).equals(info.getPlayer1Id())
                ? info.getPlayer2Nickname() : info.getPlayer1Nickname();
        g.setOpponentNickname(opponentNick);
        if ("WIN".equals(result)) g.setWinAmount((long) info.getBetAmount() * 2L);
        else if ("DRAW".equals(result)) g.setWinAmount((long) info.getBetAmount()); // hoàn lại
        else g.setWinAmount(0L);
        g.setFen(req.getFinalFen() != null ? req.getFinalFen() : g.getFen());
        g.setMovesUci(req.getMoves());
        int moveCount = countTokens(req.getMoves());
        g.setMoveCount(moveCount);
        int whiteMoves = (moveCount + 1) / 2;
        int blackMoves = moveCount / 2;
        g.setPlayerMoveCount("WHITE".equals(color) ? whiteMoves : blackMoves);
        g.setCreatedAt(finishedAt);
        g.setFinishedAt(finishedAt);
        g.setBalanceBefore(balanceBefore);
        g.setBalanceAfter(balanceAfter);
        chessGameRepository.save(g);
    }

    private int countTokens(String moves) {
        if (moves == null) return 0;
        String t = moves.trim();
        if (t.isEmpty()) return 0;
        return t.split("\\s+").length;
    }

    private String resultForUser(String userId, String winnerId) {
        if ("draw".equalsIgnoreCase(winnerId)) return "DRAW";
        if (String.valueOf(userId).equals(String.valueOf(winnerId))) return "WIN";
        return "LOSE";
    }

    private Long parseLong(String v) {
        try {
            return v == null ? null : Long.parseLong(v);
        } catch (Exception e) {
            return null;
        }
    }
}

