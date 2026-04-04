package com.webbetting.backend.repository;

import com.webbetting.backend.model.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    @Query("SELECT m FROM ChatMessage m WHERE m.gameId = :gameId ORDER BY m.createdAt ASC")
    List<ChatMessage> findByGameId(@Param("gameId") String gameId);

    @Query("SELECT COUNT(m) FROM ChatMessage m WHERE m.gameId = :gameId")
    long countByGameId(@Param("gameId") String gameId);

    @Modifying
    @Transactional
    @Query("DELETE FROM ChatMessage m WHERE m.expiresAt < :now")
    int deleteExpired(@Param("now") LocalDateTime now);

    // Xóa tin nhắn cũ nhất khi vượt 100 tin
    @Query("SELECT m FROM ChatMessage m WHERE m.gameId = :gameId ORDER BY m.createdAt ASC")
    List<ChatMessage> findOldestByGameId(@Param("gameId") String gameId);
}
