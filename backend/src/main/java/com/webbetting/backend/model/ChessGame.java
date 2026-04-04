package com.webbetting.backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "chess_games")
public class ChessGame {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "difficulty", nullable = false)
    private String difficulty;

    @Column(name = "player_color", nullable = false)
    private String playerColor;

    @Column(name = "stake_amount", nullable = false)
    private Long stakeAmount;

    @Column(name = "status", nullable = false)
    private String status;

    @Column(name = "game_result")
    private String gameResult;

    @Column(name = "win_amount")
    private Long winAmount;

    @Column(name = "fen", length = 255, nullable = false)
    private String fen;

    @Column(name = "moves_uci", length = 65535)
    private String movesUci;

    @Column(name = "move_count", nullable = false)
    private Integer moveCount;

    @Column(name = "player_move_count", nullable = false)
    private Integer playerMoveCount;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "finished_at")
    private LocalDateTime finishedAt;

    @Column(name = "balance_before")
    private Long balanceBefore;

    @Column(name = "balance_after")
    private Long balanceAfter;

    @Column(name = "opponent_nickname")
    private String opponentNickname; // Tên đối thủ (PvP)

    public ChessGame() {
        this.createdAt = LocalDateTime.now();
        this.moveCount = 0;
        this.playerMoveCount = 0;
        this.status = "IN_PROGRESS";
        this.fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public String getDifficulty() { return difficulty; }
    public void setDifficulty(String difficulty) { this.difficulty = difficulty; }

    public String getPlayerColor() { return playerColor; }
    public void setPlayerColor(String playerColor) { this.playerColor = playerColor; }

    public Long getStakeAmount() { return stakeAmount; }
    public void setStakeAmount(Long stakeAmount) { this.stakeAmount = stakeAmount; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getGameResult() { return gameResult; }
    public void setGameResult(String gameResult) { this.gameResult = gameResult; }

    public Long getWinAmount() { return winAmount; }
    public void setWinAmount(Long winAmount) { this.winAmount = winAmount; }

    public String getFen() { return fen; }
    public void setFen(String fen) { this.fen = fen; }

    public String getMovesUci() { return movesUci; }
    public void setMovesUci(String movesUci) { this.movesUci = movesUci; }

    public Integer getMoveCount() { return moveCount; }
    public void setMoveCount(Integer moveCount) { this.moveCount = moveCount; }

    public Integer getPlayerMoveCount() { return playerMoveCount; }
    public void setPlayerMoveCount(Integer playerMoveCount) { this.playerMoveCount = playerMoveCount; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getFinishedAt() { return finishedAt; }
    public void setFinishedAt(LocalDateTime finishedAt) { this.finishedAt = finishedAt; }

    public Long getBalanceBefore() { return balanceBefore; }
    public void setBalanceBefore(Long balanceBefore) { this.balanceBefore = balanceBefore; }

    public Long getBalanceAfter() { return balanceAfter; }
    public void setBalanceAfter(Long balanceAfter) { this.balanceAfter = balanceAfter; }

    public String getOpponentNickname() { return opponentNickname; }
    public void setOpponentNickname(String opponentNickname) { this.opponentNickname = opponentNickname; }
}

