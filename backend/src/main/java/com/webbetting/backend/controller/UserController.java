package com.webbetting.backend.controller;

import com.webbetting.backend.model.TopUpHistory;
import com.webbetting.backend.model.User;
import com.webbetting.backend.dto.UserSummaryDto;
import com.webbetting.backend.repository.TopUpHistoryRepository;
import com.webbetting.backend.service.UserService;
import com.webbetting.backend.security.JwtService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class UserController {

    @Autowired
    private UserService userService;
    
    @Autowired
    private TopUpHistoryRepository topUpHistoryRepository;
    
    @Autowired
    private JwtService jwtService;

    // ========== PUBLIC APIs ==========
    
    @GetMapping("/top")
    public List<User> getTop(@RequestParam(defaultValue = "10") int limit) {
        return userService.getTopUsers(limit);
    }

    // ========== AUTHENTICATED APIs (cần login) ==========
    
    // 🔹 Lấy thông tin user HIỆN TẠI (từ token)
    @GetMapping("/me")
    public User getCurrentUser(HttpServletRequest request) {
        Long userId = getUserIdFromToken(request);
        return userService.getById(userId);
    }

    // 🔹 Update nickname của CHÍNH MÌNH
    @PutMapping("/me/nickname")
    public User updateMyNickname(
            HttpServletRequest request,
            @RequestBody Map<String, String> payload
    ) {
        Long userId = getUserIdFromToken(request);
        String newNickname = payload.get("nickname");
        return userService.updateNickname(userId, newNickname);
    }

    // 🔹 User nạp điểm cho CHÍNH MÌNH
    @PostMapping("/me/topup")
    public ResponseEntity<?> topUpMyself(
            HttpServletRequest request,
            @RequestBody Map<String, Object> payload
    ) {
        Long userId = getUserIdFromToken(request);
        
        Object amountObj = payload.get("amount");
        Long amount = amountObj instanceof Integer ? ((Integer) amountObj).longValue() : (Long) amountObj;
        String method = (String) payload.getOrDefault("method", "bank");
        
        if (amount == null || amount <= 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "Amount must be positive"));
        }
        
        User updated = userService.userTopUp(userId, amount, method);
        return ResponseEntity.ok(updated);
    }

    // 🔹 Xem lịch sử nạp của CHÍNH MÌNH
    @GetMapping("/me/topup-history")
    public List<TopUpHistory> getMyTopUps(HttpServletRequest request) {
        Long userId = getUserIdFromToken(request);
        return topUpHistoryRepository.findByUserId(userId);
    }

    // ========== ADMIN APIs (giữ nguyên) ==========
    
    @GetMapping("/{id}")
    public UserSummaryDto getUser(@PathVariable Long id) {
        return userService.mapToDTO(userService.getById(id));
    }

    @PutMapping("/{id}/nickname")
    public User updateNickname(@PathVariable Long id, @RequestBody User payload) {
        return userService.updateNickname(id, payload.getNickname());
    }

    @PutMapping("/{id}/avatar")
    public ResponseEntity<?> updateAvatar(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        String avatarUrl = payload.get("avatarUrl");
        if (avatarUrl == null || avatarUrl.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "avatarUrl is required"));
        }
        User updated = userService.updateAvatar(id, avatarUrl);
        return ResponseEntity.ok(updated);
    }
 
    @PutMapping("/{id}/balance")
    public ResponseEntity<?> setUserBalance(@PathVariable Long id, @RequestBody Map<String, Long> payload) {
        try {
            Long newBalance = payload.get("balance");
            if (newBalance == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "balance is required"));
            }
            User updated = userService.setBalance(id, newBalance);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/topup")
    public ResponseEntity<?> topUp(
            @PathVariable Long id,
            @RequestBody Map<String, Object> payload
    ) {
        Object amountObj = payload.get("amount");
        Long amount = amountObj instanceof Integer ? ((Integer) amountObj).longValue() : (Long) amountObj;
        String method = (String) payload.getOrDefault("method", "admin_topup");
        
        User updated = userService.userTopUp(id, amount, method);
        return ResponseEntity.ok(updated);
    }
    
    @GetMapping("/{id}/topup-history")
    public List<TopUpHistory> getUserTopUps(@PathVariable Long id) {
        return topUpHistoryRepository.findByUserId(id);
    }
    
    // ========== HELPER METHOD ==========
    
    private Long getUserIdFromToken(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new RuntimeException("No token provided");
        }
        
        String token = authHeader.substring(7);
        String username = jwtService.extractUsername(token);
        
        User user = userService.getByUsername(username);
        return user.getId();
    }
}