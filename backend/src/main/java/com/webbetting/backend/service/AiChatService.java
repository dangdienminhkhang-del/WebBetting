package com.webbetting.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Service
public class AiChatService {

    private static final String SYSTEM_PROMPT =
        "You are a friendly AI assistant inside a Caro (5-in-a-row) and Chess betting game. " +
        "You help players with: chatting casually, suggesting moves, encouraging players. " +
        "Keep responses: short (under 100 words), friendly, a bit playful, use simple language. " +
        "If asked in Vietnamese, reply in Vietnamese.";

    private static final int TIMEOUT_MS = 15000;

    @Value("${ai.gemini.key:}") private String geminiKey;
    @Value("${ai.groq.key:}") private String groqKey;
    @Value("${ai.openrouter.key:}") private String openRouterKey;
    @Value("${ai.mistral.key:}") private String mistralKey;
    @Value("${ai.deepseek.key:}") private String deepseekKey;

    private final RestTemplate restTemplate;

    public AiChatService() {
        org.springframework.http.client.SimpleClientHttpRequestFactory factory =
            new org.springframework.http.client.SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(TIMEOUT_MS);
        factory.setReadTimeout(TIMEOUT_MS);
        this.restTemplate = new RestTemplate(factory);
    }

    public String chat(String userMessage) {
        // Debug: log key status khi nhận request
        System.out.println("[AI] Keys - Gemini:" + (geminiKey.isBlank() ? "MISSING" : "OK") 
            + " DeepSeek:" + (deepseekKey.isBlank() ? "MISSING" : "OK(" + deepseekKey.substring(0,8) + "...)")
            + " Groq:" + (groqKey.isBlank() ? "MISSING" : "OK")
            + " Mistral:" + (mistralKey.isBlank() ? "MISSING" : "OK"));
        // Try each provider in order
        String[] providers = {"gemini", "deepseek", "groq", "mistral"};
        for (String provider : providers) {
            try {
                String reply = switch (provider) {
                    case "gemini"     -> callGemini(userMessage);
                    case "deepseek"   -> callDeepSeek(userMessage);
                    case "groq"       -> callGroq(userMessage);
                    case "mistral"    -> callMistral(userMessage);
                    default           -> null;
                };
                if (reply != null && !reply.isBlank()) {
                    System.out.println("[AI] Success with provider: " + provider);
                    return reply;
                }
            } catch (Exception e) {
                System.out.println("[AI] " + provider + " failed: " + e.getClass().getSimpleName() + " - " + e.getMessage());
                if (e.getCause() != null) System.out.println("[AI] Cause: " + e.getCause().getMessage());
            }
        }
        return "Xin lỗi, mình đang bận xíu. Thử lại sau nhé! 🙏";
    }

    // ── Gemini ──
    private String callGemini(String message) {
        if (geminiKey == null || geminiKey.isBlank() || geminiKey.equals("YOUR_GEMINI_KEY")) {
            System.out.println("[AI] Gemini key not configured, skipping");
            return null;
        }
        // Tất cả model đều dùng v1beta — endpoint ổn định nhất
        String[] models = {"gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"};
        for (String model : models) {
            try {
                String url = "https://generativelanguage.googleapis.com/v1beta/models/"
                           + model + ":generateContent?key=" + geminiKey;
                System.out.println("[AI] Trying Gemini model: " + model);

                Map<String, Object> body = Map.of(
                    "contents", List.of(
                        Map.of("role", "user", "parts", List.of(
                            Map.of("text", SYSTEM_PROMPT + "\n\nUser: " + message)
                        ))
                    ),
                    "generationConfig", Map.of("maxOutputTokens", 200, "temperature", 0.8)
                );

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                ResponseEntity<Map> res = restTemplate.postForEntity(
                    url, new HttpEntity<>(body, headers), Map.class);
                String result = extractGemini(res.getBody());
                if (result != null && !result.isBlank()) {
                    System.out.println("[AI] Gemini success with model: " + model);
                    return result;
                }
            } catch (org.springframework.web.client.HttpClientErrorException e) {
                if (e.getStatusCode().value() == 429) {
                    System.out.println("[AI] Gemini quota exhausted (429), skipping");
                    return null;
                }
                System.out.println("[AI] Gemini " + model + " failed: " + e.getStatusCode() + " - " + e.getResponseBodyAsString().substring(0, Math.min(120, e.getResponseBodyAsString().length())));
            } catch (Exception e) {
                System.out.println("[AI] Gemini " + model + " failed: " + e.getMessage());
            }
        }
        return null;
    }

    @SuppressWarnings("unchecked")
    private String extractGemini(Map body) {
        if (body == null) return null;
        var candidates = (List<?>) body.get("candidates");
        if (candidates == null || candidates.isEmpty()) return null;
        var content = (Map<?, ?>) ((Map<?, ?>) candidates.get(0)).get("content");
        if (content == null) return null;
        var parts = (List<?>) content.get("parts");
        if (parts == null || parts.isEmpty()) return null;
        return (String) ((Map<?, ?>) parts.get(0)).get("text");
    }

    // ── Groq ──
    private String callGroq(String message) {
        if (groqKey == null || groqKey.isBlank() || groqKey.equals("YOUR_GROQ_KEY")) return null;
        String url = "https://api.groq.com/openai/v1/chat/completions";
        // Dùng model mới nhất của Groq (llama3 đã bị decommission)
        String[] groqModels = {"llama-3.1-8b-instant", "llama3-70b-8192", "mixtral-8x7b-32768"};
        for (String model : groqModels) {
            try {
                Map<String, Object> body = Map.of(
                    "model", model,
                    "messages", List.of(
                        Map.of("role", "system", "content", SYSTEM_PROMPT),
                        Map.of("role", "user", "content", message)
                    ),
                    "max_tokens", 200
                );
                ResponseEntity<Map> res = restTemplate.postForEntity(url, entity(body, "Bearer " + groqKey), Map.class);
                String result = extractOpenAIStyle(res.getBody());
                if (result != null && !result.isBlank()) {
                    System.out.println("[AI] Groq success with model: " + model);
                    return result;
                }
            } catch (Exception e) {
                System.out.println("[AI] Groq model " + model + " failed: " + e.getMessage().substring(0, Math.min(80, e.getMessage().length())));
            }
        }
        return null;
    }

    // ── OpenRouter ──
    private String callOpenRouter(String message) {
        if (openRouterKey == null || openRouterKey.isBlank() || openRouterKey.equals("YOUR_OPENROUTER_KEY")) return null;
        String url = "https://openrouter.ai/api/v1/chat/completions";
        Map<String, Object> body = Map.of(
            "model", "mistralai/mistral-7b-instruct",
            "messages", List.of(
                Map.of("role", "system", "content", SYSTEM_PROMPT),
                Map.of("role", "user", "content", message)
            ),
            "max_tokens", 200
        );
        ResponseEntity<Map> res = restTemplate.postForEntity(url, entity(body, "Bearer " + openRouterKey), Map.class);
        return extractOpenAIStyle(res.getBody());
    }

    // ── DeepSeek ──
    private String callDeepSeek(String message) {
        if (deepseekKey == null || deepseekKey.isBlank()) return null;
        System.out.println("[AI] Calling DeepSeek");
        String url = "https://api.deepseek.com/v1/chat/completions";
        Map<String, Object> body = Map.of(
            "model", "deepseek-chat",
            "messages", List.of(
                Map.of("role", "system", "content", SYSTEM_PROMPT),
                Map.of("role", "user", "content", message)
            ),
            "max_tokens", 200
        );
        ResponseEntity<Map> res = restTemplate.postForEntity(url, entity(body, "Bearer " + deepseekKey), Map.class);
        return extractOpenAIStyle(res.getBody());
    }

    // ── Mistral ──
    private String callMistral(String message) {
        if (mistralKey == null || mistralKey.isBlank() || mistralKey.equals("YOUR_MISTRAL_KEY")) return null;
        System.out.println("[AI] Calling Mistral, key starts with: " + mistralKey.substring(0, Math.min(6, mistralKey.length())));
        String url = "https://api.mistral.ai/v1/chat/completions";
        Map<String, Object> body = Map.of(
            "model", "mistral-small-latest",
            "messages", List.of(
                Map.of("role", "system", "content", SYSTEM_PROMPT),
                Map.of("role", "user", "content", message)
            ),
            "max_tokens", 200
        );
        ResponseEntity<Map> res = restTemplate.postForEntity(url, entity(body, "Bearer " + mistralKey), Map.class);
        return extractOpenAIStyle(res.getBody());
    }

    @SuppressWarnings("unchecked")
    private String extractOpenAIStyle(Map body) {
        if (body == null) return null;
        var choices = (List<?>) body.get("choices");
        if (choices == null || choices.isEmpty()) return null;
        var msg = (Map<?, ?>) ((Map<?, ?>) choices.get(0)).get("message");
        if (msg == null) return null;
        return (String) msg.get("content");
    }

    private HttpEntity<Map<String, Object>> entity(Map<String, Object> body, String auth) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        if (auth != null) headers.set("Authorization", auth);
        return new HttpEntity<>(body, headers);
    }
}
