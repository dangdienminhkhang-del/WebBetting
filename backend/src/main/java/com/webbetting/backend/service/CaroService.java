package com.webbetting.backend.service;

import com.webbetting.backend.model.CaroGame;
import com.webbetting.backend.model.TransactionType;
import com.webbetting.backend.model.User;
import com.webbetting.backend.repository.CaroGameRepository;
import com.webbetting.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class CaroService {

    @Autowired
    private CaroGameRepository caroGameRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TransactionService transactionService;

    // ─── AI GAME FLOW (giống Chess) ───────────────────────────────────────────

    /**
     * Bắt đầu ván AI: trừ tiền cược ngay, tạo game record IN_PROGRESS.
     */
    @Transactional
    public CaroGame startAiGame(User user, int betAmount, String aiMode, String playerSymbol) {
        User dbUser = userRepository.findById(user.getId())
                .orElseThrow(() -> new RuntimeException("User not found"));

        long before = dbUser.getBalance() != null ? dbUser.getBalance() : 0L;
        if (before < betAmount) throw new RuntimeException("Insufficient balance");

        // Trừ tiền cược ngay
        long after = before - betAmount;
        dbUser.setBalance(after);
        userRepository.save(dbUser);

        transactionService.createTransaction(dbUser, TransactionType.BET, (long) betAmount, before, after);

        CaroGame game = new CaroGame();
        game.setUser(dbUser);
        game.setOpponentType("AI");
        game.setDifficulty(aiMode);
        game.setBoardSize(50);
        game.setBetAmount(betAmount);
        game.setWinAmount(0);
        game.setStatus("IN_PROGRESS");
        game.setGameResult(null);
        game.setUserScore(0);
        game.setOpponentScore(0);
        game.setGameMoves("");
        game.setBalanceBefore(before);
        game.setBalanceAfter(dbUser.getBalance());
        game.setPlayerSymbol(playerSymbol != null ? playerSymbol : "X");
        game.setCreatedAt(LocalDateTime.now());
        game.setFinishedAt(null);

        System.out.println("🎮 Caro AI started: user=" + dbUser.getUsername()
                + " bet=" + betAmount + " balance: " + before + " → " + dbUser.getBalance());
        return caroGameRepository.save(game);
    }

    /**
     * Lấy game AI đang active của user.
     */
    public Optional<CaroGame> getActiveAiGame(User user) {
        CaroGame game = caroGameRepository.findTopByUserIdAndStatusOrderByCreatedAtDesc(
                user.getId(), "IN_PROGRESS");
        // Chỉ trả về AI game (không phải PvP)
        if (game != null && "AI".equals(game.getOpponentType())) return Optional.of(game);
        return Optional.empty();
    }

    /**
     * Kết thúc ván AI: cộng/hoàn tiền theo kết quả, update record.
     */
    @Transactional
    public CaroGame finishAiGame(User user, long gameId, String result, String moves) {
        CaroGame game = getOwnedAiGame(user, gameId);
        if (!"IN_PROGRESS".equals(game.getStatus())) return game;

        User dbUser = userRepository.findById(user.getId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        long currentBalance = dbUser.getBalance() != null ? dbUser.getBalance() : 0L;
        long bet = game.getBetAmount() != null ? game.getBetAmount() : 0L;

        game.setStatus("FINISHED");
        game.setFinishedAt(LocalDateTime.now());
        game.setGameResult(result);
        game.setGameMoves(moves != null ? moves : "");

        if ("WIN".equals(result)) {
            // Thắng: nhận lại bet*2 (tiền của mình + thưởng)
            long after = currentBalance + bet * 2;
            dbUser.setBalance(after);
            transactionService.createTransaction(dbUser, TransactionType.WIN, bet * 2, currentBalance, after);
            game.setWinAmount((int)(bet * 2));
            game.setUserScore(1);
            game.setOpponentScore(0);
        } else if ("DRAW".equals(result)) {
            // Hòa: hoàn lại tiền cược
            long after = currentBalance + bet;
            dbUser.setBalance(after);
            transactionService.createTransaction(dbUser, TransactionType.WIN, bet, currentBalance, after); // Coi như là thắng 0đ
            game.setWinAmount((int) bet);
            game.setUserScore(0);
            game.setOpponentScore(0);
        } else {
            // LOSE: không trừ thêm (đã trừ lúc start)
            game.setWinAmount(0);
            game.setUserScore(0);
            game.setOpponentScore(1);
        }

        userRepository.save(dbUser);
        game.setBalanceAfter(dbUser.getBalance());

        System.out.println("🏁 Caro AI finished: " + result + " | balance: "
                + currentBalance + " → " + dbUser.getBalance());
        return caroGameRepository.save(game);
    }

    /**
     * Bỏ ván AI (abandon): game đang dở, không hoàn tiền (đã trừ lúc start).
     * Lưu record LOSE để tracking.
     */
    @Transactional
    public CaroGame abandonAiGame(User user, long gameId) {
        CaroGame game = getOwnedAiGame(user, gameId);
        if (!"IN_PROGRESS".equals(game.getStatus())) return game;

        game.setStatus("RESIGNED");
        game.setGameResult("LOSE");
        game.setWinAmount(0);
        game.setUserScore(0);
        game.setOpponentScore(1);
        game.setFinishedAt(LocalDateTime.now());
        // balanceAfter = balanceBefore - bet (đã trừ lúc start, không đổi)
        long bet = game.getBetAmount() != null ? game.getBetAmount() : 0L;
        long before = game.getBalanceBefore() != null ? game.getBalanceBefore() : 0L;
        game.setBalanceAfter(before - bet);

        System.out.println("🏳️ Caro AI abandoned: user=" + user.getUsername()
                + " bet=" + bet);
        return caroGameRepository.save(game);
    }

    private CaroGame getOwnedAiGame(User user, long gameId) {
        CaroGame game = caroGameRepository.findById(gameId)
                .orElseThrow(() -> new RuntimeException("Game not found"));
        if (!game.getUser().getId().equals(user.getId()))
            throw new RuntimeException("Not your game");
        if (!"AI".equals(game.getOpponentType()))
            throw new RuntimeException("Not an AI game");
        return game;
    }

    // ─── PvP GAME RECORD (lưu lịch sử, không tính balance) ──────────────────

    /**
     * Lưu kết quả PvP - chỉ lưu record, balance đã được PvpSettlementService xử lý.
     */
    @Transactional
    public CaroGame savePvpRecord(User user, String result, int betAmount, int winAmount,
                                   String moves, long balanceBefore, long balanceAfter) {
        CaroGame g = new CaroGame();
        g.setUser(user);
        g.setOpponentType("PVP");
        g.setDifficulty("PVP");
        g.setBoardSize(50);
        g.setGameResult(result);
        g.setBetAmount(betAmount);
        g.setWinAmount(winAmount);
        g.setStatus("FINISHED");
        g.setUserScore("WIN".equals(result) ? 1 : 0);
        g.setOpponentScore("LOSE".equals(result) ? 1 : 0);
        g.setGameMoves(moves != null ? moves : "");
        g.setBalanceBefore(balanceBefore);
        g.setBalanceAfter(balanceAfter);
        g.setCreatedAt(LocalDateTime.now());
        g.setFinishedAt(LocalDateTime.now());
        return caroGameRepository.save(g);
    }

    // ─── HISTORY & STATS ─────────────────────────────────────────────────────

    public List<CaroGame> getUserGameHistory(Long userId) {
        Optional<User> user = userRepository.findById(userId);
        return user.map(caroGameRepository::findByUserOrderByFinishedAtDesc).orElse(List.of());
    }

    public Map<String, Object> getUserStats(Long userId) {
        Optional<User> user = userRepository.findById(userId);
        if (user.isEmpty()) return createEmptyStats();

        Long totalGames = caroGameRepository.countTotalGamesByUser(user.get());
        Long totalWins = caroGameRepository.countWinsByUser(user.get());
        Long totalWinAmount = caroGameRepository.getTotalWinAmountByUser(user.get());
        double winRate = totalGames > 0 ? (double) totalWins / totalGames * 100 : 0;

        return Map.of(
            "totalGames", totalGames,
            "totalBets", totalGames,
            "totalWins", totalWins,
            "wins", totalWins,
            "losses", totalGames - totalWins,
            "winRate", Math.round(winRate * 100.0) / 100.0,
            "totalWinAmount", totalWinAmount
        );
    }

    private Map<String, Object> createEmptyStats() {
        return Map.of("totalGames", 0, "totalBets", 0, "totalWins", 0,
                "wins", 0, "losses", 0, "winRate", 0.0, "totalWinAmount", 0);
    }
}
