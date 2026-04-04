package com.webbetting.backend.dto;

public class ChessStartRequest {
    private Long stakeAmount;
    private String difficulty;
    private String playerColor;

    public Long getStakeAmount() { return stakeAmount; }
    public void setStakeAmount(Long stakeAmount) { this.stakeAmount = stakeAmount; }

    public String getDifficulty() { return difficulty; }
    public void setDifficulty(String difficulty) { this.difficulty = difficulty; }

    public String getPlayerColor() { return playerColor; }
    public void setPlayerColor(String playerColor) { this.playerColor = playerColor; }
}

