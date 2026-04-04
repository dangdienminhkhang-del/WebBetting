package com.webbetting.backend.controller;

import com.webbetting.backend.model.User;
import com.webbetting.backend.repository.UserRepository;
import com.webbetting.backend.security.JwtService;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth/oauth2")
public class OAuth2Controller {

    @Autowired private UserRepository userRepository;
    @Autowired private JwtService jwtService;
    @Autowired private UserDetailsService userDetailsService;
    @Autowired private PasswordEncoder passwordEncoder;

    private final RestTemplate restTemplate = new RestTemplate();

    @Data
    public static class OAuthRequest {
        private String provider;     // "google" | "facebook"
        private String accessToken;  // token từ provider
        private boolean isIdToken;   // true nếu là Google ID token (JWT)
    }

    /**
     * Frontend gửi access_token từ Google/Facebook.
     * Backend verify với provider, tạo/tìm user, trả JWT.
     */
    @PostMapping("/callback")
    public ResponseEntity<?> handleOAuth(@RequestBody OAuthRequest req) {
        try {
            OAuthUserInfo info = fetchUserInfo(req.getProvider(), req.getAccessToken(), req.isIdToken());
            if (info == null) {
                return ResponseEntity.status(401).body(Map.of("error", "Token không hợp lệ."));
            }

            // Tìm user theo providerId hoặc email
            String providerKey = req.getProvider() + "_" + info.getId();
            Optional<User> existing = userRepository.findByProviderKey(providerKey);

            User user;
            if (existing.isPresent()) {
                user = existing.get();
                // Cập nhật avatar nếu có
                if (info.getAvatarUrl() != null && !info.getAvatarUrl().isEmpty()) {
                    user.setAvatarUrl(info.getAvatarUrl());
                    userRepository.save(user);
                }
            } else {
                // Thử tìm theo email
                if (info.getEmail() != null) {
                    Optional<User> byEmail = userRepository.findByUsername(info.getEmail());
                    if (byEmail.isPresent()) {
                        user = byEmail.get();
                        user.setProviderKey(providerKey);
                        if (info.getAvatarUrl() != null) user.setAvatarUrl(info.getAvatarUrl());
                        userRepository.save(user);
                    } else {
                        user = createOAuthUser(info, providerKey, req.getProvider());
                    }
                } else {
                    user = createOAuthUser(info, providerKey, req.getProvider());
                }
            }

            if (!user.isActive() || user.isDeleted()) {
                return ResponseEntity.status(403).body(Map.of("error", "Tài khoản đã bị vô hiệu hóa."));
            }

            UserDetails userDetails = userDetailsService.loadUserByUsername(user.getUsername());
            String token = jwtService.generateToken(userDetails);

            return ResponseEntity.ok(Map.of(
                "token", token,
                "user", Map.of(
                    "id", user.getId(),
                    "username", user.getUsername(),
                    "nickname", user.getNickname(),
                    "balance", user.getBalance(),
                    "role", user.getRole(),
                    "avatarUrl", user.getAvatarUrl() != null ? user.getAvatarUrl() : "",
                    "token", token
                )
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Lỗi xác thực: " + e.getMessage()));
        }
    }

    // ── Fetch user info từ provider ──────────────────────────────────────────

    private OAuthUserInfo fetchUserInfo(String provider, String accessToken, boolean isIdToken) {
        try {
            if ("google".equalsIgnoreCase(provider)) {
                if (isIdToken) return verifyGoogleIdToken(accessToken);
                return fetchGoogleUserInfo(accessToken);
            } else if ("facebook".equalsIgnoreCase(provider)) {
                return fetchFacebookUserInfo(accessToken);
            }
        } catch (Exception e) {
            System.err.println("OAuth fetch error: " + e.getMessage());
        }
        return null;
    }

    /** Verify Google ID token qua tokeninfo endpoint */
    @SuppressWarnings("unchecked")
    private OAuthUserInfo verifyGoogleIdToken(String idToken) {
        String url = "https://oauth2.googleapis.com/tokeninfo?id_token=" + idToken;
        ResponseEntity<Map<String, Object>> res = restTemplate.exchange(
                url, HttpMethod.GET, null,
                (Class<Map<String, Object>>)(Class<?>)Map.class);
        if (res.getStatusCode() != HttpStatus.OK || res.getBody() == null) return null;
        Map<String, Object> body = res.getBody();
        OAuthUserInfo info = new OAuthUserInfo();
        info.setId(String.valueOf(body.get("sub")));
        info.setEmail(body.getOrDefault("email", "").toString());
        info.setName(body.getOrDefault("name", "User").toString());
        info.setAvatarUrl(body.getOrDefault("picture", "").toString());
        return info;
    }

    @SuppressWarnings("unchecked")
    private OAuthUserInfo fetchGoogleUserInfo(String accessToken) {
        String url = "https://www.googleapis.com/oauth2/v3/userinfo";
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        ResponseEntity<Map<String, Object>> res = restTemplate.exchange(
                url, HttpMethod.GET, entity,
                (Class<Map<String, Object>>)(Class<?>)Map.class);
        if (res.getStatusCode() != HttpStatus.OK || res.getBody() == null) return null;

        Map<String, Object> body = res.getBody();
        OAuthUserInfo info = new OAuthUserInfo();
        info.setId(String.valueOf(body.get("sub")));
        info.setEmail(body.getOrDefault("email", "").toString());
        info.setName(body.getOrDefault("name", "User").toString());
        info.setAvatarUrl(body.getOrDefault("picture", "").toString());
        return info;
    }

    @SuppressWarnings("unchecked")
    private OAuthUserInfo fetchFacebookUserInfo(String accessToken) {
        String url = "https://graph.facebook.com/me?fields=id,name,email,picture.width(200)&access_token=" + accessToken;
        ResponseEntity<Map<String, Object>> res = restTemplate.exchange(
                url, HttpMethod.GET, null,
                (Class<Map<String, Object>>)(Class<?>)Map.class);
        if (res.getStatusCode() != HttpStatus.OK || res.getBody() == null) return null;

        Map<String, Object> body = res.getBody();
        OAuthUserInfo info = new OAuthUserInfo();
        info.setId(String.valueOf(body.get("id")));
        info.setEmail(body.get("email") != null ? body.get("email").toString() : null);
        info.setName(body.getOrDefault("name", "User").toString());

        // Lấy avatar từ picture.data.url
        try {
            Map<String, Object> picture = (Map<String, Object>) body.get("picture");
            if (picture != null) {
                Map<String, Object> data = (Map<String, Object>) picture.get("data");
                if (data != null && data.get("url") != null) {
                    info.setAvatarUrl(data.get("url").toString());
                }
            }
        } catch (Exception ignored) {}

        return info;
    }

    // ── Create new OAuth user ────────────────────────────────────────────────

    private User createOAuthUser(OAuthUserInfo info, String providerKey, String provider) {
        User user = new User();

        // Username: email hoặc provider_id
        String username = info.getEmail() != null && !info.getEmail().isEmpty()
                ? info.getEmail()
                : provider + "_" + info.getId();
        // Đảm bảo username unique
        if (userRepository.findByUsername(username).isPresent()) {
            username = username + "_" + UUID.randomUUID().toString().substring(0, 4);
        }
        user.setUsername(username);

        // Nickname từ tên thật
        String nickname = sanitizeNickname(info.getName());
        // Đảm bảo nickname unique
        String baseNick = nickname;
        int suffix = 1;
        while (userRepository.findByNickname(nickname).isPresent()) {
            nickname = baseNick + suffix++;
        }
        user.setNickname(nickname);

        user.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
        user.setBalance(1000L);
        user.setRole("USER");
        user.setActive(true);
        user.setDeleted(false);
        user.setProviderKey(providerKey);
        if (info.getAvatarUrl() != null && !info.getAvatarUrl().isEmpty()) {
            user.setAvatarUrl(info.getAvatarUrl());
        }

        return userRepository.save(user);
    }

    private String sanitizeNickname(String name) {
        if (name == null || name.isBlank()) return "User";
        // Giữ chữ cái, số, khoảng trắng, tối đa 20 ký tự
        return name.replaceAll("[^\\p{L}\\p{N} ]", "").trim()
                   .substring(0, Math.min(name.length(), 20)).trim();
    }

    // ── Inner DTO ────────────────────────────────────────────────────────────

    @Data
    private static class OAuthUserInfo {
        private String id;
        private String email;
        private String name;
        private String avatarUrl;
    }
}
