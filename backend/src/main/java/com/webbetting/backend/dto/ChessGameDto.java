package com.webbetting.backend.dto;

import com.webbetting.backend.model.ChessGame;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class ChessGameDto {
    private Long id;
    private Long userId;
    private String username;
    private String difficulty;
    private String playerColor;
    private Long stakeAmount;
    private String status;
    private String gameResult;
    private Long winAmount;
    private Integer moveCount;
    private LocalDateTime createdAt;
    private LocalDateTime finishedAt;

    public ChessGameDto(ChessGame g) {
        this.id = g.getId();
        this.userId = g.getUser().getId();
        this.username = g.getUser().getUsername();
        this.difficulty = g.getDifficulty();
        this.playerColor = g.getPlayerColor();
        this.stakeAmount = g.getStakeAmount();
        this.status = g.getStatus();
        this.gameResult = g.getGameResult();
        this.winAmount = g.getWinAmount();
        this.moveCount = g.getMoveCount();
        this.createdAt = g.getCreatedAt();
        this.finishedAt = g.getFinishedAt();
    }
}
