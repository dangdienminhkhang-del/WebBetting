package com.webbetting.backend.controller;

import com.webbetting.backend.dto.ChessMoveRequest;
import com.webbetting.backend.dto.ChessStartRequest;
import com.webbetting.backend.model.ChessGame;
import com.webbetting.backend.model.User;
import com.webbetting.backend.repository.UserRepository;
import com.webbetting.backend.security.JwtService;
import com.webbetting.backend.service.ChessService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/chess")
@CrossOrigin(origins = "*")
public class ChessController {

    @Autowired
    private ChessService chessService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtService jwtService;

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
            throw new RuntimeException("User not authenticated: " + e.getMessage());
        }
    }

    @PostMapping("/start")
    public ResponseEntity<?> start(@RequestBody ChessStartRequest body, HttpServletRequest request) {
        try {
            User currentUser = getCurrentUser(request);
            ChessGame game = chessService.startGame(
                    currentUser,
                    body.getStakeAmount() == null ? 0L : body.getStakeAmount(),
                    body.getDifficulty(),
                    body.getPlayerColor()
            );

            User updatedUser = userRepository.findById(currentUser.getId()).orElse(currentUser);
            return ResponseEntity.ok(toGameResponse(game, updatedUser.getBalance()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
    @GetMapping("/test-start")
    public ResponseEntity<?> testStart(HttpServletRequest request) {
        try {
            User currentUser = getCurrentUser(request);
            return ResponseEntity.ok(Map.of(
                "user", currentUser.getUsername(),
                "balance", currentUser.getBalance(),
                "activeGames", chessService.getActiveGameCount(currentUser)
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/active")
    public ResponseEntity<?> getActive(HttpServletRequest request) {
        try {
            User currentUser = getCurrentUser(request);
            Optional<ChessGame> active = chessService.getActiveGame(currentUser);
            User updatedUser = userRepository.findById(currentUser.getId()).orElse(currentUser);

            if (active.isEmpty()) {
                return ResponseEntity.ok(Map.of(
                        "active", false,
                        "balance", updatedUser.getBalance() == null ? 0L : updatedUser.getBalance()
                ));
            }

            Map<String, Object> data = new HashMap<>(toGameResponse(active.get(), updatedUser.getBalance()));
            data.put("active", true);
            return ResponseEntity.ok(data);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
    @PostMapping("/matches/{id}/move")
    public ResponseEntity<?> move(@PathVariable Long id, @RequestBody ChessMoveRequest body, HttpServletRequest request) {
        try {
            User currentUser = getCurrentUser(request);
            ChessGame game = chessService.makeMove(currentUser, id, body.getFrom(), body.getTo(), body.getPromotion());
            User updatedUser = userRepository.findById(currentUser.getId()).orElse(currentUser);
            return ResponseEntity.ok(toGameResponse(game, updatedUser.getBalance()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/matches/{id}/leave")
    public ResponseEntity<?> leave(@PathVariable Long id, HttpServletRequest request) {
        try {
            User currentUser = getCurrentUser(request);
            ChessGame game = chessService.leaveGame(currentUser, id);
            User updatedUser = userRepository.findById(currentUser.getId()).orElse(currentUser);
            return ResponseEntity.ok(toGameResponse(game, updatedUser.getBalance()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/matches/{id}/cancel")
    public ResponseEntity<?> cancel(@PathVariable Long id, HttpServletRequest request) {
        try {
            User currentUser = getCurrentUser(request);
            ChessGame game = chessService.cancelBeforeFirstMove(currentUser, id);
            User updatedUser = userRepository.findById(currentUser.getId()).orElse(currentUser);
            return ResponseEntity.ok(toGameResponse(game, updatedUser.getBalance()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/history")
    public ResponseEntity<?> history(HttpServletRequest request) {
        try {
            User currentUser = getCurrentUser(request);
            List<ChessGame> games = chessService.getHistory(currentUser);
            
            List<Map<String, Object>> gameHistory = games.stream().map(game -> {
                Map<String, Object> dto = new HashMap<>();
                dto.put("id", game.getId());
                dto.put("difficulty", game.getDifficulty());
                dto.put("playerColor", game.getPlayerColor());
                dto.put("stakeAmount", game.getStakeAmount());
                dto.put("status", game.getStatus());
                dto.put("gameResult", game.getGameResult());
                dto.put("winAmount", game.getWinAmount());
                dto.put("balanceBefore", game.getBalanceBefore());
                dto.put("balanceAfter", game.getBalanceAfter());
                dto.put("createdAt", game.getCreatedAt());
                dto.put("finishedAt", game.getFinishedAt());
                return dto;
            }).collect(Collectors.toList());
            
            return ResponseEntity.ok(gameHistory);
        } catch (Exception e) {
            return ResponseEntity.ok(List.of());
        }
    }

    private Map<String, Object> toGameResponse(ChessGame game, Long balance) {
        int playerMoves = game.getPlayerMoveCount() == null ? 0 : game.getPlayerMoveCount();
        Map<String, Object> dto = new HashMap<>();
        dto.put("gameId", game.getId());
        dto.put("fen", game.getFen());
        dto.put("status", game.getStatus());
        dto.put("gameResult", game.getGameResult());
        dto.put("winAmount", game.getWinAmount());
        dto.put("difficulty", game.getDifficulty());
        dto.put("playerColor", game.getPlayerColor());
        dto.put("stakeAmount", game.getStakeAmount());
        dto.put("leavePenalty", game.getStakeAmount());
        dto.put("moveCount", game.getMoveCount());
        dto.put("playerMoveCount", playerMoves);
        dto.put("canChangeConfig", playerMoves == 0);
        dto.put("movesUci", game.getMovesUci());
        dto.put("balance", balance == null ? 0L : balance);
        return dto;
    }
}
