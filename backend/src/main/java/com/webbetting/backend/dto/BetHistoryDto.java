package com.webbetting.backend.dto;

import com.webbetting.backend.model.BetHistory;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class BetHistoryDto {
    private Long id;
    private Long userId;
    private String username;
    private String game;
    private Long betAmount;   // alias for amount - clearer name
    private Long amount;
    private String result;
    private Long balanceAfter;
    private LocalDateTime createdAt;

    public BetHistoryDto(BetHistory betHistory) {
        this.id = betHistory.getId();
        this.userId = betHistory.getUser().getId();
        this.username = betHistory.getUser().getUsername();
        this.game = betHistory.getGame();
        this.amount = betHistory.getAmount();
        this.betAmount = betHistory.getAmount();
        this.result = betHistory.getResult();
        this.balanceAfter = betHistory.getBalanceAfter();
        this.createdAt = betHistory.getCreatedAt();
    }
}
