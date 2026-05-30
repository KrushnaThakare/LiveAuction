package com.cricketauction.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "tournaments")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Tournament {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    private String description;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "tournament", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Player> players = new ArrayList<>();

    @OneToMany(mappedBy = "tournament", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Team> teams = new ArrayList<>();

    // Tournament logo
    @Column(name = "logo_url", length = 500)
    private String logoUrl;

    // Registration settings
    @Column(name = "banner_url", length = 500)
    private String bannerUrl;

    @Column(name = "registration_enabled")
    @Builder.Default
    private Boolean registrationEnabled = false;

    @Column(name = "registration_message", length = 1000)
    private String registrationMessage;

    @Column(name = "registration_redirect_link", length = 500)
    private String registrationRedirectLink;

    // Broadcast overlay settings
    @Column(name = "overlay_enabled")
    @Builder.Default
    private Boolean overlayEnabled = true;

    @Column(name = "overlay_theme", length = 50)
    @Builder.Default
    private String overlayTheme = "classic";

    @Column(name = "overlay_show_team_budget")
    @Builder.Default
    private Boolean overlayShowTeamBudget = true;

    @Column(name = "overlay_show_team_list")
    @Builder.Default
    private Boolean overlayShowTeamList = true;

    @Column(name = "overlay_show_ticker")
    @Builder.Default
    private Boolean overlayShowTicker = true;

    @Column(name = "overlay_secret_token", length = 120)
    private String overlaySecretToken;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
