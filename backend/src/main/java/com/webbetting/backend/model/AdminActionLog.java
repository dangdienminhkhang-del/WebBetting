package com.webbetting.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "admin_action_logs")
@Data
@NoArgsConstructor
public class AdminActionLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long adminId;

    @Column(nullable = false)
    private String action;

    private Long targetUserId;

    private Long amount;

    @Column(length = 500)
    private String description;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    public AdminActionLog(Long adminId, String action, Long targetUserId, Long amount, String description) {
        this.adminId = adminId;
        this.action = action;
        this.targetUserId = targetUserId;
        this.amount = amount;
        this.description = description;
        this.timestamp = LocalDateTime.now();
    }
}
