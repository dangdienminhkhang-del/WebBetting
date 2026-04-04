package com.webbetting.backend.service;

import com.webbetting.backend.model.ChatMessage;
import com.webbetting.backend.repository.ChatMessageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ChatService {

    private static final int MAX_MESSAGES_PER_GAME = 100;

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    @Transactional
    public ChatMessage saveMessage(String gameId, String gameType, String senderId, String senderNickname, String content) {
        // Giới hạn 100 tin/game - xóa tin cũ nhất nếu vượt
        long count = chatMessageRepository.countByGameId(gameId);
        if (count >= MAX_MESSAGES_PER_GAME) {
            List<ChatMessage> oldest = chatMessageRepository.findOldestByGameId(gameId);
            if (!oldest.isEmpty()) {
                chatMessageRepository.delete(oldest.get(0));
            }
        }
        ChatMessage msg = new ChatMessage(gameId, gameType, senderId, senderNickname, content);
        return chatMessageRepository.save(msg);
    }

    public List<ChatMessage> getHistory(String gameId) {
        return chatMessageRepository.findByGameId(gameId);
    }
}
