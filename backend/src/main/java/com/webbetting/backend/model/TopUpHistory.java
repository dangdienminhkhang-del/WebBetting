package com.webbetting.backend.model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "topup_history")
@Data
public class TopUpHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private Long amount;

    private Long balanceBefore;
    private Long balanceAfter;

    private String createdBy; // USER | ADMIN

    private String method; // bank | momo | card

    private LocalDateTime createdAt = LocalDateTime.now();
}
