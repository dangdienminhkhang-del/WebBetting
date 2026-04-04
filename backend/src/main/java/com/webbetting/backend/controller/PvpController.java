package com.webbetting.backend.controller;

import com.webbetting.backend.model.User;
import com.webbetting.backend.repository.UserRepository;
import com.webbetting.backend.security.JwtService;
import com.webbetting.backend.service.PvpGameService;
import com.webbetting.backend.service.PvpSessionStore;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/pvp")
@CrossOrigin(origins = "*")
public class PvpController {

    @Autowired private PvpGameService pvpGameService;
    @Autowired private PvpSessionStore sessionStore;
    @Autowired private JwtService jwtService;
    @Autowired private UserRepository userRepository;

    /**
     * GET /api/pvp/current
     * Trả về game PvP đang active của user (nếu có).
     * Frontend gọi khi load trang để check xem có ván cũ cần resume không.
     */
    @GetMapping("/current")
    public ResponseEntity<?> getCurrent(HttpServletRequest request) {
        User user = getUser(request);
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));

        String userId = String.valueOf(user.getId());
        PvpSessionStore.PvpSession session = sessionStore.findActiveByUserId(userId);
        if (session == null) {
            return ResponseEntity.ok(Map.of("hasGame", false));
        }

        PvpGameService.GameStatePayload payload = pvpGameService.buildPayload(session, null);
        return ResponseEntity.ok(Map.of("hasGame", true, "state", payload));
    }

    /**
     * GET /api/pvp/session/{gameId}
     * Trả về full state của một ván cụ thể.
     */
    @GetMapping("/session/{gameId}")
    public ResponseEntity<?> getSession(@PathVariable String gameId, HttpServletRequest request) {
        User user = getUser(request);
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));

        String userId = String.valueOf(user.getId());
        PvpSessionStore.PvpSession session = sessionStore.get(gameId);
        if (session == null) return ResponseEntity.ok(Map.of("exists", false));

        if (!userId.equals(session.getPlayer1Id()) && !userId.equals(session.getPlayer2Id())) {
            return ResponseEntity.status(403).body(Map.of("error", "Not a participant"));
        }

        PvpGameService.GameStatePayload payload = pvpGameService.buildPayload(session, null);
        return ResponseEntity.ok(Map.of("exists", true, "state", payload));
    }

    /**
     * POST /api/pvp/resign
     * User chủ động rời phòng → xử thua ngay.
     */
    @PostMapping("/resign")
    public ResponseEntity<?> resign(HttpServletRequest request) {
        User user = getUser(request);
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));

        String userId = String.valueOf(user.getId());
        PvpSessionStore.PvpSession session = sessionStore.findActiveByUserId(userId);
        if (session == null) return ResponseEntity.ok(Map.of("ok", true, "message", "No active game"));

        String opponentId = userId.equals(session.getPlayer1Id()) ? session.getPlayer2Id() : session.getPlayer1Id();
        pvpGameService.settleGame(session, opponentId, userId, "resign");
        return ResponseEntity.ok(Map.of("ok", true));
    }

    private User getUser(HttpServletRequest request) {
        try {
            String auth = request.getHeader("Authorization");
            if (auth == null || !auth.startsWith("Bearer ")) return null;
            String username = jwtService.extractUsername(auth.substring(7));
            return userRepository.findByUsername(username).orElse(null);
        } catch (Exception e) {
            return null;
        }
    }
}
