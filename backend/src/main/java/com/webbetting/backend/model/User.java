package com.webbetting.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import com.fasterxml.jackson.annotation.JsonProperty;

@Entity
@Table(name = "users")
@Data
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(nullable = false)
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String password;

    @Column(nullable = false)
    private String nickname;

    @Column(nullable = false)
    private Long balance = 1000L;

    @Column(nullable = false)
    private String role = "USER"; // USER | ADMIN

    @Column(nullable = false)
    private boolean isActive = true;

    @Column(nullable = false)
    private boolean isDeleted = false;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime lockedAt;

    @Column(columnDefinition = "MEDIUMTEXT")
    private String avatarUrl;

    @Column(name = "provider_key", unique = true)
    private String providerKey; // "google_123456" | "facebook_789"
}
