package com.webbetting.backend.controller;

import com.webbetting.backend.model.ChatMessage;
import com.webbetting.backend.service.AiChatService;
import com.webbetting.backend.service.ChatService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    @Autowired
    private ChatService chatService;

    @Autowired
    private AiChatService aiChatService;

    @GetMapping("/{gameId}")
    public ResponseEntity<List<Map<String, Object>>> getHistory(@PathVariable String gameId) {
        List<ChatMessage> messages = chatService.getHistory(gameId);
        List<Map<String, Object>> result = messages.stream().map(m -> Map.<String, Object>of(
            "id", m.getId(),
            "senderId", m.getSenderId(),
            "senderNickname", m.getSenderNickname(),
            "content", m.getContent(),
            "createdAt", m.getCreatedAt().toString()
        )).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @PostMapping("/ai")
    public ResponseEntity<Map<String, String>> aiChat(@RequestBody Map<String, String> body) {
        String message = body.get("message");
        if (message == null || message.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("reply", "Tin nhắn không hợp lệ"));
        }
        String reply = aiChatService.chat(message.trim());
        return ResponseEntity.ok(Map.of("reply", reply));
    }
}
