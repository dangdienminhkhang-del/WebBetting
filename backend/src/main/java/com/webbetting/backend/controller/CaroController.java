package com.webbetting.backend.controller;

import com.webbetting.backend.model.CaroGame;
import com.webbetting.backend.model.User;
import com.webbetting.backend.repository.CaroGameRepository;
import com.webbetting.backend.repository.UserRepository;
import com.webbetting.backend.security.JwtService;
import com.webbetting.backend.service.CaroService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/caro")
@CrossOrigin(origins = "*")
public class CaroController {

    @Autowired private CaroService caroService;
    @Autowired private UserRepository userRepository;
    @Autowired private JwtService jwtService;
    @Autowired private CaroGameRepository caroGameRepository;

    private User getCurrentUser(HttpServletRequest request) {
        try {
            String authHeader = request.getHeader("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                String username = jwtService.extractUsername(token);
                return userRepository.findByUsername(username)
                        .orElseThrow(() -> new RuntimeException("User not found"));
            }
            throw new RuntimeException("User not authenticated");
        } catch (Exception e) {
            throw new RuntimeException("User not found");
        }
    }

    // ─── AI GAME ENDPOINTS (giống Chess) ─────────────────────────────────────

    /**
     * POST /api/caro/start
     * Bắt đầu ván AI: trừ tiền ngay, tạo game record.
     */
    @PostMapping("/start")
    public ResponseEntity<?> start(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        try {
            User user = getCurrentUser(request);
            int betAmount = ((Number) body.getOrDefault("betAmount", 0)).intValue();
            String aiMode = String.valueOf(body.getOrDefault("aiMode", "Easy"));
            String playerSymbol = String.valueOf(body.getOrDefault("playerSymbol", "X"));

            CaroGame game = caroService.startAiGame(user, betAmount, aiMode, playerSymbol);
            User updated = userRepository.findById(user.getId()).orElse(user);
            return ResponseEntity.ok(toGameResponse(game, updated.getBalance()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * GET /api/caro/active
     * Lấy game AI đang active (để resume sau refresh).
     */
    @GetMapping("/active")
    public ResponseEntity<?> getActive(HttpServletRequest request) {
        try {
            User user = getCurrentUser(request);
            Optional<CaroGame> active = caroService.getActiveAiGame(user);
            User updated = userRepository.findById(user.getId()).orElse(user);

            if (active.isEmpty()) {
                return ResponseEntity.ok(Map.of("active", false, "balance", updated.getBalance()));
            }
            Map<String, Object> data = new HashMap<>(toGameResponse(active.get(), updated.getBalance()));
            data.put("active", true);
            return ResponseEntity.ok(data);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * POST /api/caro/matches/{id}/finish
     * Kết thúc ván AI: cộng/hoàn tiền theo kết quả.
     */
    @PostMapping("/matches/{id}/finish")
    public ResponseEntity<?> finish(@PathVariable Long id,
                                     @RequestBody Map<String, Object> body,
                                     HttpServletRequest request) {
        try {
            User user = getCurrentUser(request);
            String result = String.valueOf(body.getOrDefault("result", "LOSE"));
            String moves = String.valueOf(body.getOrDefault("moves", ""));

            CaroGame game = caroService.finishAiGame(user, id, result, moves);
            User updated = userRepository.findById(user.getId()).orElse(user);
            return ResponseEntity.ok(toGameResponse(game, updated.getBalance()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * POST /api/caro/matches/{id}/abandon
     * Bỏ ván AI đang dở: lưu LOSE, không hoàn tiền.
     */
    @PostMapping("/matches/{id}/abandon")
    public ResponseEntity<?> abandon(@PathVariable Long id, HttpServletRequest request) {
        try {
            User user = getCurrentUser(request);
            CaroGame game = caroService.abandonAiGame(user, id);
            User updated = userRepository.findById(user.getId()).orElse(user);
            return ResponseEntity.ok(toGameResponse(game, updated.getBalance()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ─── LEGACY ENDPOINT (giữ để không break existing code) ─────────────────

    @PostMapping("/save-game")
    public ResponseEntity<?> saveGameResult(@RequestBody CaroGame caroGame, HttpServletRequest request) {
        try {
            User currentUser = getCurrentUser(request);
            caroGame.setUser(currentUser);
            // Chỉ lưu record, không tính balance (balance đã được xử lý)
            if (caroGame.getStatus() == null) caroGame.setStatus("FINISHED");
            CaroGame saved = caroGameRepository.save(caroGame);
            User updated = userRepository.findById(currentUser.getId()).orElse(currentUser);
            return ResponseEntity.ok(Map.of("game", saved, "newBalance", updated.getBalance()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ─── HISTORY & STATS ─────────────────────────────────────────────────────

    @GetMapping("/history")
    public ResponseEntity<List<CaroGame>> getGameHistory(HttpServletRequest request) {
        try {
            User currentUser = getCurrentUser(request);
            List<CaroGame> history = caroService.getUserGameHistory(currentUser.getId());
            history.forEach(game -> {
                if (game.getUser() != null) {
                    User minimalUser = new User();
                    minimalUser.setId(game.getUser().getId());
                    minimalUser.setUsername(game.getUser().getUsername());
                    game.setUser(minimalUser);
                }
            });
            return ResponseEntity.ok(history);
        } catch (Exception e) {
            return ResponseEntity.ok(List.of());
        }
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getUserStats(HttpServletRequest request) {
        try {
            User currentUser = getCurrentUser(request);
            return ResponseEntity.ok(caroService.getUserStats(currentUser.getId()));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("totalGames",0,"totalBets",0,"totalWins",0,
                    "wins",0,"losses",0,"winRate",0.0,"totalWinAmount",0));
        }
    }

    @GetMapping("/games/{id}/replay")
    public ResponseEntity<?> getGameReplay(@PathVariable Long id, HttpServletRequest request) {
        try {
            User currentUser = getCurrentUser(request);
            CaroGame game = caroGameRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Game not found"));
            if (!game.getUser().getId().equals(currentUser.getId())
                    && !currentUser.getRole().equals("ADMIN")) {
                return ResponseEntity.status(403).body(Map.of("error", "Forbidden"));
            }
            return ResponseEntity.ok(game);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/games/public/{id}")
    public ResponseEntity<?> getPublicGame(@PathVariable Long id) {
        try {
            CaroGame game = caroGameRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Game not found"));
            return ResponseEntity.ok(Map.of(
                "id", game.getId(), "boardSize", game.getBoardSize(),
                "difficulty", game.getDifficulty(), "gameResult", game.getGameResult(),
                "userScore", game.getUserScore(), "opponentScore", game.getOpponentScore(),
                "gameMoves", game.getGameMoves(), "createdAt", game.getCreatedAt()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private Map<String, Object> toGameResponse(CaroGame game, Long balance) {
        Map<String, Object> dto = new HashMap<>();
        dto.put("gameId", game.getId());
        dto.put("status", game.getStatus());
        dto.put("gameResult", game.getGameResult());
        dto.put("betAmount", game.getBetAmount());
        dto.put("winAmount", game.getWinAmount());
        dto.put("difficulty", game.getDifficulty());
        dto.put("gameMoves", game.getGameMoves());
        dto.put("balance", balance == null ? 0L : balance);
        return dto;
    }
}
