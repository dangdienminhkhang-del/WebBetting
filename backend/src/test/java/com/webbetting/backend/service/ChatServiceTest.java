package com.webbetting.backend.service;

import com.webbetting.backend.model.ChatMessage;
import com.webbetting.backend.repository.ChatMessageRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ChatServiceTest {

    @Mock ChatMessageRepository chatMessageRepository;
    @InjectMocks ChatService chatService;

    @Test
    void saveMessage_shouldPersistMessage() {
        when(chatMessageRepository.countByGameId("game-1")).thenReturn(0L);
        when(chatMessageRepository.save(any())).thenAnswer(inv -> {
            ChatMessage m = inv.getArgument(0);
            m.setId(1L);
            return m;
        });

        ChatMessage result = chatService.saveMessage("game-1", "CARO", "user1", "Player1", "Hello!");

        assertThat(result.getContent()).isEqualTo("Hello!");
        assertThat(result.getGameId()).isEqualTo("game-1");
        assertThat(result.getExpiresAt()).isNotNull();
        verify(chatMessageRepository).save(any());
    }

    @Test
    void saveMessage_shouldDeleteOldestWhenOver100() {
        ChatMessage oldest = new ChatMessage();
        oldest.setId(1L);

        when(chatMessageRepository.countByGameId("game-1")).thenReturn(100L);
        when(chatMessageRepository.findOldestByGameId("game-1")).thenReturn(List.of(oldest));
        when(chatMessageRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        chatService.saveMessage("game-1", "CARO", "user1", "Player1", "New message");

        verify(chatMessageRepository).delete(oldest);
    }

    @Test
    void getHistory_shouldReturnMessagesForGame() {
        ChatMessage msg = new ChatMessage("game-1", "CARO", "user1", "Player1", "Hi");
        when(chatMessageRepository.findByGameId("game-1")).thenReturn(List.of(msg));

        List<ChatMessage> result = chatService.getHistory("game-1");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getContent()).isEqualTo("Hi");
    }
}
