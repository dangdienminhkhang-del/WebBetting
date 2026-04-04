package com.webbetting.backend.service;

import com.webbetting.backend.model.BetHistory;
import com.webbetting.backend.model.CaroGame;
import com.webbetting.backend.model.TransactionType;
import com.webbetting.backend.model.User;
import com.webbetting.backend.repository.BetHistoryRepository;
import com.webbetting.backend.repository.UserRepository;
import com.webbetting.backend.repository.CaroGameRepository;
import com.webbetting.backend.repository.ChessGameRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class BetService {

    @Autowired
    private CaroGameRepository caroGameRepository;

    @Autowired
    private ChessGameRepository chessGameRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BetHistoryRepository betHistoryRepository;

    @Autowired
    private TransactionService transactionService;

    @Transactional
    public void deleteFilteredHistory(Long userId, String game, String result) {
        String dbResult = "ALL".equals(result) ? null : result;
        
        if ("ALL".equals(game) || "TAIXIU".equals(game)) {
            betHistoryRepository.deleteByUserIdAndResult(userId, dbResult);
        }
        
        if ("ALL".equals(game) || "CARO".equals(game)) {
            caroGameRepository.deleteByUserIdAndResult(userId, dbResult);
        }
        
        if ("ALL".equals(game) || "CHESS".equals(game)) {
            chessGameRepository.deleteByUserIdAndResult(userId, dbResult);
        }
    }

    // ✅ CHỈNH LẠI: chuẩn logic cập nhật số dư và lưu lịch sử
    @Transactional
    public BetHistory placeBet(Long userId, Long amount, String game, boolean win) {
        Optional<User> optionalUser = userRepository.findById(userId);
        if (optionalUser.isEmpty()) {
            throw new RuntimeException("User not found");
        }

        User user = optionalUser.get();

        if (user.getBalance() < amount && !win) {
            throw new RuntimeException("Not enough balance");
        }

        long currentBalance = user.getBalance();
        long changeAmount = win ? amount : -amount;
        long newBalance = currentBalance + changeAmount;

        user.setBalance(newBalance);
        userRepository.save(user);

        transactionService.createTransaction(user, win ? TransactionType.WIN : TransactionType.BET, amount, currentBalance, newBalance);

        // ✅ Lưu lịch sử cược với số dư sau thật
        BetHistory history = new BetHistory();
        history.setUser(user);
        history.setGame(game);
        history.setAmount(amount);
        history.setResult(win ? "WIN" : "LOSE");
        history.setBalanceAfter(newBalance);
        history.setCreatedAt(LocalDateTime.now());

        return betHistoryRepository.save(history);
    }

    public List<BetHistory> getHistoryByUserId(Long userId) {
        // ✅ Giữ nguyên logic gốc
        return betHistoryRepository.findHistoryByUser(userId);
    }

    // ✅ Giữ nguyên logic Tài Xỉu cũ, chỉ format lại
    @Transactional
    public Map<String, Object> placeTaiXiuBet(Long userId, Long amount, String playerChoice) {
        Optional<User> optionalUser = userRepository.findById(userId);
        if (optionalUser.isEmpty()) {
            throw new RuntimeException("User not found");
        }

        User user = optionalUser.get();

        if (user.getBalance() < amount) {
            throw new RuntimeException("Not enough balance");
        }

        // 🔹 RANDOM 2 XÚC XẮC
        int dice1 = (int) (Math.random() * 6) + 1;
        int dice2 = (int) (Math.random() * 6) + 1;
        int total = dice1 + dice2;

        // 🔹 XÁC ĐỊNH KẾT QUẢ
        String actualResult = (total >= 8) ? "TAI" : "XIU";
        boolean win = playerChoice.equalsIgnoreCase(actualResult);

        // 🔹 CẬP NHẬT SỐ DƯ
        long currentBalance = user.getBalance();
        long changeAmount = win ? amount : -amount;
        long newBalance = currentBalance + changeAmount;
        user.setBalance(newBalance);
        userRepository.save(user);

        transactionService.createTransaction(user, win ? TransactionType.WIN : TransactionType.BET, amount, currentBalance, newBalance);

        // 🔹 LƯU LỊCH SỬ
        BetHistory history = new BetHistory();
        history.setUser(user);
        history.setGame("TAIXIU");
        history.setAmount(amount);
        history.setResult(win ? "WIN" : "LOSE");
        history.setBalanceAfter(newBalance);
        history.setCreatedAt(LocalDateTime.now());
        
        BetHistory savedHistory = betHistoryRepository.save(history);

        // 🔹 TRẢ VỀ ĐẦY ĐỦ THÔNG TIN
        Map<String, Object> response = new HashMap<>();
        response.put("id", savedHistory.getId());
        response.put("dice1", dice1);
        response.put("dice2", dice2);
        response.put("total", total);
        response.put("actualResult", actualResult); // "TAI" hoặc "XIU"
        response.put("win", win);
        response.put("newBalance", newBalance);
        response.put("playerChoice", playerChoice);
        response.put("amount", amount);
        
        return response;
    }


    // ✅ THỐNG KÊ NGƯỜI DÙNG - GỘP CẢ CARO VÀ TÀI XỈU
    public Map<String, Object> getUserStats(Long userId) {
        List<BetHistory> userHistory = betHistoryRepository.findHistoryByUser(userId);

        List<CaroGame> caroGames = caroGameRepository.findByUserOrderByFinishedAtDesc(
            userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"))
        );

        long totalBets = userHistory.size() + caroGames.size();
        long totalWins = userHistory.stream().filter(h -> "WIN".equals(h.getResult())).count()
                         + caroGames.stream().filter(g -> "WIN".equals(g.getGameResult())).count();
        long totalLosses = totalBets - totalWins;

        // ✅ Gom thống kê từng game
        Map<String, Map<String, Object>> gameStats = new HashMap<>();

        // Tài Xỉu
        gameStats.put("TAIXIU", createEmptyGameStats());
        for (BetHistory history : userHistory) {
            if ("TAIXIU".equals(history.getGame())) {
                updateGameStats(gameStats.get("TAIXIU"), history.getResult());
            }
        }

        // Caro
        gameStats.put("CARO", createEmptyGameStats());
        for (CaroGame game : caroGames) {
            updateGameStats(gameStats.get("CARO"), game.getGameResult());
        }

        Map<String, Object> response = new HashMap<>();
        response.put("totalStats", Map.of(
            "totalBets", totalBets,
            "totalWins", totalWins,
            "totalLosses", totalLosses,
            "winRate", totalBets > 0 ? Math.round((double) totalWins / totalBets * 100 * 100) / 100.0 : 0.0
        ));
        response.put("gameStats", gameStats);

        return response;
    }

    // ✅ Helpers
    private void updateGameStats(Map<String, Object> stats, String result) {
        stats.put("totalBets", (Long) stats.get("totalBets") + 1);
        if ("WIN".equalsIgnoreCase(result)) {
            stats.put("wins", (Long) stats.get("wins") + 1);
        } else {
            stats.put("losses", (Long) stats.get("losses") + 1);
        }

        long totalBets = (Long) stats.get("totalBets");
        long wins = (Long) stats.get("wins");
        stats.put("winRate", totalBets > 0 ? Math.round((double) wins / totalBets * 100 * 100) / 100.0 : 0.0);
    }

    private Map<String, Object> createEmptyGameStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalBets", 0L);
        stats.put("wins", 0L);
        stats.put("losses", 0L);
        stats.put("winRate", 0.0);
        return stats;
    }
}
