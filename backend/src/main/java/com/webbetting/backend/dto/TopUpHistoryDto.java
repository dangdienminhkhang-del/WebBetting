package com.webbetting.backend.dto;

import com.webbetting.backend.model.TopUpHistory;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class TopUpHistoryDto {
    private Long id;
    private Long userId;
    private String username;
    private Long amount;
    private Long balanceBefore;
    private Long balanceAfter;
    private String createdBy;
    private String method;
    private LocalDateTime createdAt;

    public TopUpHistoryDto(TopUpHistory t) {
        this.id = t.getId();
        this.userId = t.getUser().getId();
        this.username = t.getUser().getUsername();
        this.amount = t.getAmount();
        this.balanceBefore = t.getBalanceBefore();
        this.balanceAfter = t.getBalanceAfter();
        this.createdBy = t.getCreatedBy();
        this.method = t.getMethod();
        this.createdAt = t.getCreatedAt();
    }
}
