package com.webbetting.backend.scheduler;

import com.webbetting.backend.repository.ChatMessageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
public class ChatCleanupScheduler {

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    // Chạy mỗi ngày lúc 3 giờ sáng
    @Scheduled(cron = "0 0 3 * * *")
    public void deleteExpiredMessages() {
        int deleted = chatMessageRepository.deleteExpired(LocalDateTime.now());
        System.out.println("[ChatCleanup] Deleted " + deleted + " expired chat messages");
    }
}
