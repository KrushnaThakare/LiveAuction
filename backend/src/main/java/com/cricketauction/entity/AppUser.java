package com.cricketauction.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "app_users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AppUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String username;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String displayName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private UserRole role = UserRole.VIEWER;

    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "last_login")
    private LocalDateTime lastLogin;

    /** White-label branding shown in the app header for this operator */
    @Column(name = "app_name", length = 100)
    private String appName;

    @Column(name = "app_logo_url", length = 500)
    private String appLogoUrl;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public enum UserRole {
        /**
         * SUPER_ADMIN — full access: can create tournaments, manage form builder,
         * manage users, see all data. Only the product owner should have this.
         */
        SUPER_ADMIN,

        /**
         * OPERATOR — tournament operator (paying client): can run the auction,
         * manage teams, view players/sold/unsold, view registrations.
         * Cannot: create tournaments, access form builder, manage users.
         */
        OPERATOR,

        /**
         * VIEWER — broadcast/display only: can see live auction, teams, sold,
         * unsold. Read-only. Cannot bid or manage anything.
         */
        VIEWER
    }
}
