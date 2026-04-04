package com.webbetting.backend.controller;

import com.webbetting.backend.model.User;
import com.webbetting.backend.repository.BetHistoryRepository;
import com.webbetting.backend.repository.CaroGameRepository;
import com.webbetting.backend.repository.ChessGameRepository;
import com.webbetting.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/leaderboard")
public class LeaderboardController {

    @Autowired private UserRepository userRepository;
    @Autowired private BetHistoryRepository betHistoryRepository;
    @Autowired private CaroGameRepository caroGameRepository;
    @Autowired private ChessGameRepository chessGameRepository;

    // Top KGT
    @GetMapping("/balance")
    public ResponseEntity<List<Map<String, Object>>> topBalance(
            @RequestParam(defaultValue = "10") int limit) {
        List<User> users = userRepository.findAllByOrderByBalanceDesc(PageRequest.of(0, limit));
        return ResponseEntity.ok(users.stream()
                .filter(u -> !u.isDeleted())
                .map(u -> {
                    Map<String, Object> m = new java.util.HashMap<>();
                    m.put("id",        u.getId());
                    m.put("username",  u.getUsername());
                    m.put("nickname",  u.getNickname());
                    m.put("balance",   u.getBalance());
                    m.put("avatarUrl", u.getAvatarUrl());
                    return m;
                }).collect(Collectors.toList()));
    }

    // Top thắng Tài Xỉu
    @GetMapping("/taixiu")
    public ResponseEntity<List<Map<String, Object>>> topTaixiu(
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(
            betHistoryRepository.findTopWinnersByGame("TAIXIU", PageRequest.of(0, limit))
        );
    }

    // Top thắng Caro
    @GetMapping("/caro")
    public ResponseEntity<List<Map<String, Object>>> topCaro(
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(
            caroGameRepository.findTopWinners(PageRequest.of(0, limit))
        );
    }

    // Top thắng Cờ Vua
    @GetMapping("/chess")
    public ResponseEntity<List<Map<String, Object>>> topChess(
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(
            chessGameRepository.findTopWinners(PageRequest.of(0, limit))
        );
    }

    // Stats tổng hợp của 1 user (dùng cho popup)
    @GetMapping("/user-stats/{userId}")
    public ResponseEntity<Map<String, Object>> userStats(@PathVariable Long userId) {
        // Tài Xỉu
        long txTotal = betHistoryRepository.countTotalByUserIdAndGame(userId, "TAIXIU");
        long txWins  = betHistoryRepository.countWinsByUserIdAndGame(userId, "TAIXIU");
        long txLoses = betHistoryRepository.countLossesByUserIdAndGame(userId, "TAIXIU");

        // Caro
        long caroTotal = caroGameRepository.countTotalByUserId(userId);
        long caroWins  = caroGameRepository.countWinsByUserId(userId);
        long caroLoses = caroGameRepository.countLossesByUserId(userId);

        // Cờ Vua
        long chessTotal = chessGameRepository.countTotalByUserId(userId);
        long chessWins  = chessGameRepository.countWinsByUserId(userId);
        long chessLoses = chessGameRepository.countLossesByUserId(userId);
        long chessDraws = chessGameRepository.countDrawsByUserId(userId);

        long totalBets   = txTotal + caroTotal + chessTotal;
        long totalWins   = txWins  + caroWins  + chessWins;
        long totalLosses = txLoses + caroLoses + chessLoses;
        long totalDraws  = chessDraws;
        double winRate   = totalBets > 0 ? Math.round((double) totalWins / totalBets * 10000) / 100.0 : 0.0;

        Map<String, Object> result = new java.util.HashMap<>();
        result.put("total", Map.of(
            "totalBets", totalBets, "totalWins", totalWins,
            "totalLosses", totalLosses, "totalDraws", totalDraws, "winRate", winRate
        ));
        result.put("taixiu", Map.of(
            "totalBets", txTotal, "wins", txWins, "losses", txLoses,
            "winRate", txTotal > 0 ? Math.round((double) txWins / txTotal * 10000) / 100.0 : 0.0
        ));
        result.put("caro", Map.of(
            "totalBets", caroTotal, "wins", caroWins, "losses", caroLoses,
            "winRate", caroTotal > 0 ? Math.round((double) caroWins / caroTotal * 10000) / 100.0 : 0.0
        ));
        result.put("chess", Map.of(
            "totalBets", chessTotal, "wins", chessWins, "losses", chessLoses,
            "draws", chessDraws,
            "winRate", chessTotal > 0 ? Math.round((double) chessWins / chessTotal * 10000) / 100.0 : 0.0
        ));
        return ResponseEntity.ok(result);
    }
}
