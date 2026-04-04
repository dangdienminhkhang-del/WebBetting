    package com.webbetting.backend.model;

    import jakarta.persistence.*;
    import lombok.Data;
    import java.time.LocalDateTime;

    @Entity
    @Table(name = "bet_history")
    @Data
    public class BetHistory {
        @Id
        @GeneratedValue(strategy = GenerationType.IDENTITY)
        private Long id;
        @Column(columnDefinition = "JSON")
        private String details;
        @ManyToOne
        @JoinColumn(name = "user_id")
        private User user;

        private String game;
        private Long amount;
        private String result;
        private Long balanceAfter;
        private LocalDateTime createdAt = LocalDateTime.now();
    }
