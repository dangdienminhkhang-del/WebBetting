package com.webbetting.backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "caro_games")
public class CaroGame {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "opponent_type")
    private String opponentType; // "AI"
    
    @Column(name = "difficulty")
    private String difficulty; // "EASY", "MEDIUM", "HARD"
    
    @Column(name = "board_size")
    private Integer boardSize;
    
    @Column(name = "game_result")
    private String gameResult; // "WIN", "LOSE", "DRAW"

    @Column(name = "status")
    private String status; // "IN_PROGRESS", "FINISHED", "RESIGNED"
    
    @Column(name = "user_score")
    private Integer userScore;
    
    @Column(name = "opponent_score")
    private Integer opponentScore;
    
    @Column(name = "bet_amount")
    private Integer betAmount;
    
    @Column(name = "win_amount")
    private Integer winAmount;
    
    @Column(name = "game_moves", length = 65535) // TEXT type
    private String gameMoves; // Lưu chuỗi các nước đi
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "finished_at")
    private LocalDateTime finishedAt;
    
    @Column(name = "balance_before")
    private Long balanceBefore;
    
    @Column(name = "balance_after")
    private Long balanceAfter;

    @Column(name = "player_symbol")
    private String playerSymbol; // "X" hoặc "O"

    @Column(name = "opponent_nickname")
    private String opponentNickname; // Tên đối thủ (PvP)

    // Constructors
    public CaroGame() {
        this.createdAt = LocalDateTime.now();
        this.finishedAt = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public String getOpponentType() { return opponentType; }
    public void setOpponentType(String opponentType) { this.opponentType = opponentType; }

    public String getDifficulty() { return difficulty; }
    public void setDifficulty(String difficulty) { this.difficulty = difficulty; }

    public Integer getBoardSize() { return boardSize; }
    public void setBoardSize(Integer boardSize) { this.boardSize = boardSize; }

    public String getGameResult() { return gameResult; }
    public void setGameResult(String gameResult) { this.gameResult = gameResult; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Integer getUserScore() { return userScore; }
    public void setUserScore(Integer userScore) { this.userScore = userScore; }

    public Integer getOpponentScore() { return opponentScore; }
    public void setOpponentScore(Integer opponentScore) { this.opponentScore = opponentScore; }

    public Integer getBetAmount() { return betAmount; }
    public void setBetAmount(Integer betAmount) { this.betAmount = betAmount; }

    public Integer getWinAmount() { return winAmount; }
    public void setWinAmount(Integer winAmount) { this.winAmount = winAmount; }

    public String getGameMoves() { return gameMoves; }
    public void setGameMoves(String gameMoves) { this.gameMoves = gameMoves; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getFinishedAt() { return finishedAt; }
    public void setFinishedAt(LocalDateTime finishedAt) { this.finishedAt = finishedAt; }

    public Long getBalanceBefore() { return balanceBefore; }
    public void setBalanceBefore(Long balanceBefore) { this.balanceBefore = balanceBefore; }

    public Long getBalanceAfter() { return balanceAfter; }
    public void setBalanceAfter(Long balanceAfter) { this.balanceAfter = balanceAfter; }

    public String getPlayerSymbol() { return playerSymbol; }
    public void setPlayerSymbol(String playerSymbol) { this.playerSymbol = playerSymbol; }

    public String getOpponentNickname() { return opponentNickname; }
    public void setOpponentNickname(String opponentNickname) { this.opponentNickname = opponentNickname; }
}