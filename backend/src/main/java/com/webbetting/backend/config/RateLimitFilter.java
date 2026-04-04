package com.webbetting.backend.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class RateLimitFilter implements Filter {

    // IP → Bucket
    private final Map<String, Bucket> loginBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> aiBuckets = new ConcurrentHashMap<>();

    private Bucket newLoginBucket() {
        // 10 requests / phút cho login
        return Bucket.builder()
                .addLimit(Bandwidth.builder().capacity(10).refillGreedy(10, Duration.ofMinutes(1)).build())
                .build();
    }

    private Bucket newAiBucket() {
        // 20 requests / phút cho AI chat
        return Bucket.builder()
                .addLimit(Bandwidth.builder().capacity(20).refillGreedy(20, Duration.ofMinutes(1)).build())
                .build();
    }

    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest request = (HttpServletRequest) req;
        HttpServletResponse response = (HttpServletResponse) res;
        String path = request.getRequestURI();
        String ip = getClientIp(request);

        if (path.equals("/api/auth/login") || path.equals("/api/auth/register")) {
            Bucket bucket = loginBuckets.computeIfAbsent(ip, k -> newLoginBucket());
            if (!bucket.tryConsume(1)) {
                response.setStatus(429);
                response.setContentType("application/json");
                response.getWriter().write("{\"message\":\"Quá nhiều yêu cầu. Vui lòng thử lại sau.\"}");
                return;
            }
        }

        if (path.equals("/api/chat/ai")) {
            Bucket bucket = aiBuckets.computeIfAbsent(ip, k -> newAiBucket());
            if (!bucket.tryConsume(1)) {
                response.setStatus(429);
                response.setContentType("application/json");
                response.getWriter().write("{\"message\":\"Quá nhiều yêu cầu AI. Vui lòng thử lại sau.\"}");
                return;
            }
        }

        chain.doFilter(req, res);
    }

    private String getClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) return xff.split(",")[0].trim();
        return request.getRemoteAddr();
    }
}
