package com.webbetting.backend.controller;

import com.webbetting.backend.dto.AuthResponse;
import com.webbetting.backend.dto.UserSummaryDto;
import com.webbetting.backend.model.User;
import com.webbetting.backend.security.JwtService;
import com.webbetting.backend.security.UserDetailsServiceImpl;
import com.webbetting.backend.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.format.DateTimeFormatter;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired
    private UserService userService;

    @Autowired
    private UserDetailsServiceImpl userDetailsService;

    @Autowired
    private JwtService jwtService;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User user) {
        try {
            User registeredUser = userService.register(user.getUsername(), user.getPassword(), user.getNickname());
            return ResponseEntity.ok(userService.mapToDTO(registeredUser));
        } catch (RuntimeException e) {
            String msg = e.getMessage();
            if (msg != null && msg.contains("already exists")) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(Map.of("message", "Tên đăng nhập đã tồn tại"));
            }
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", msg != null ? msg : "Đăng ký thất bại, vui lòng thử lại"));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credentials) {
        try {
            User u = userService.login(credentials.get("username"), credentials.get("password"));
            UserDetails userDetails = userDetailsService.loadUserByUsername(u.getUsername());
            String token = jwtService.generateToken(userDetails);
            AuthResponse response = new AuthResponse(token, userService.mapToDTO(u));
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            String msg = e.getMessage();
            if (msg != null && msg.contains("locked")) {
                // Lấy user để lấy lockedAt
                try {
                    User u = userService.getByUsername(credentials.get("username"));
                    String lockedAt = u.getLockedAt() != null
                            ? u.getLockedAt().format(DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy"))
                            : "không xác định";
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("message", "Tài khoản của bạn đã bị khóa", "lockedAt", lockedAt, "code", "ACCOUNT_LOCKED"));
                } catch (Exception ignored) {}
            }
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", msg != null ? msg : "Sai tài khoản hoặc mật khẩu"));
        }
    }
}
