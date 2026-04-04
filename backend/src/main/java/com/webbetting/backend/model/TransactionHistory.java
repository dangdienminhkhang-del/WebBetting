package com.webbetting.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "transaction_history")
@Data
@NoArgsConstructor
public class TransactionHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TransactionType type;

    @Column(nullable = false)
    private Long amount;

    @Column(nullable = false)
    private Long beforeBalance;

    @Column(nullable = false)
    private Long afterBalance;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    public TransactionHistory(User user, TransactionType type, Long amount, Long beforeBalance, Long afterBalance) {
        this.user = user;
        this.type = type;
        this.amount = amount;
        this.beforeBalance = beforeBalance;
        this.afterBalance = afterBalance;
        this.createdAt = LocalDateTime.now();
    }
}
