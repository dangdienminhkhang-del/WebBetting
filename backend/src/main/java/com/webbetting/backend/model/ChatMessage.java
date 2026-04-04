package com.webbetting.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "chat_messages", indexes = {
    @Index(name = "idx_chat_game", columnList = "game_id"),
    @Index(name = "idx_chat_expires", columnList = "expires_at")
})
@Data
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "game_id", nullable = false)
    private String gameId;

    @Column(name = "game_type", nullable = false) // CARO | CHESS
    private String gameType;

    @Column(name = "sender_id", nullable = false)
    private String senderId;

    @Column(name = "sender_nickname", nullable = false)
    private String senderNickname;

    @Column(nullable = false, length = 500)
    private String content;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    public ChatMessage() {}

    public ChatMessage(String gameId, String gameType, String senderId, String senderNickname, String content) {
        this.gameId = gameId;
        this.gameType = gameType;
        this.senderId = senderId;
        this.senderNickname = senderNickname;
        this.content = content;
        this.createdAt = LocalDateTime.now();
        this.expiresAt = this.createdAt.plusDays(7);
    }
}
