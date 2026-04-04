package com.webbetting.backend.dto;

import com.webbetting.backend.model.User;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class UserSummaryDto {
    private Long id;
    private String username;
    private String nickname;
    private Long balance;
    private String role;
    private boolean isActive;
    private boolean isDeleted;
    private LocalDateTime createdAt;
    private LocalDateTime lockedAt;
    private String avatarUrl;

    public UserSummaryDto(User user) {
        this.id = user.getId();
        this.username = user.getUsername();
        this.nickname = user.getNickname();
        this.balance = user.getBalance();
        this.role = user.getRole();
        this.isActive = user.isActive();
        this.isDeleted = user.isDeleted();
        this.createdAt = user.getCreatedAt();
        this.lockedAt = user.getLockedAt();
        this.avatarUrl = user.getAvatarUrl();
    }
}
