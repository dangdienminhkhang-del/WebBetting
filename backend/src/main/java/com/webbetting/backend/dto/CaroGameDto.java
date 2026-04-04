package com.webbetting.backend.dto;

import com.webbetting.backend.model.CaroGame;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class CaroGameDto {
    private Long id;
    private Long userId;
    private String username;
    private String opponentType;
    private String difficulty;
    private int betAmount;
    private String gameResult;
    private LocalDateTime finishedAt;

    public CaroGameDto(CaroGame caroGame) {
        this.id = caroGame.getId();
        this.userId = caroGame.getUser().getId();
        this.username = caroGame.getUser().getUsername();
        this.opponentType = caroGame.getOpponentType();
        this.difficulty = caroGame.getDifficulty();
        this.betAmount = caroGame.getBetAmount();
        this.gameResult = caroGame.getGameResult();
        this.finishedAt = caroGame.getFinishedAt();
    }
}
