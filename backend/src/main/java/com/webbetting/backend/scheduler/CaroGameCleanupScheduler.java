package com.webbetting.backend.scheduler;

import com.webbetting.backend.repository.CaroGameRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Component
public class CaroGameCleanupScheduler {

    @Autowired
    private CaroGameRepository caroGameRepository;

    // Chạy lúc 3:00 sáng mỗi ngày
    @Scheduled(cron = "0 0 3 * * ?")
    @Transactional
    public void cleanupOldGames() {
        try {
            LocalDateTime threeDaysAgo = LocalDateTime.now().minusDays(3);
            int deletedCount = caroGameRepository.deleteByCreatedAtBefore(threeDaysAgo);
            
            System.out.println("✅ Cleaned up " + deletedCount + " old Caro games (older than 3 days)");
        } catch (Exception e) {
            System.err.println("❌ Error cleaning up Caro games: " + e.getMessage());
        }
    }
}