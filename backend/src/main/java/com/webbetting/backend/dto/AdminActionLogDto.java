package com.webbetting.backend.dto;

import com.webbetting.backend.model.AdminActionLog;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class AdminActionLogDto {
    private Long id;
    private Long adminId;
    private String action;
    private Long targetUserId;
    private Long amount;
    private String description;
    private LocalDateTime timestamp;

    public AdminActionLogDto(AdminActionLog log) {
        this.id = log.getId();
        this.adminId = log.getAdminId();
        this.action = log.getAction();
        this.targetUserId = log.getTargetUserId();
        this.amount = log.getAmount();
        this.description = log.getDescription();
        this.timestamp = log.getTimestamp();
    }
}
