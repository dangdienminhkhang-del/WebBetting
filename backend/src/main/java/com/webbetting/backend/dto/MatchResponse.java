package com.webbetting.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MatchResponse {
    private String gameId;
    private String opponentId;
    private String opponentNickname;
    private String role;
    private String gameType;
    private int betAmount;
}