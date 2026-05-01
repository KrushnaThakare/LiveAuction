package com.cricketauction.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "player_registrations")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlayerRegistration {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tournament_id", nullable = false)
    private Tournament tournament;

    /** All field values stored as JSON map */
    @Column(name = "form_data", columnDefinition = "TEXT", nullable = false)
    private String formData;

    /** Primary player name (extracted from form_data for quick display) */
    @Column(name = "player_name")
    private String playerName;

    /** Primary phone number for dedup */
    @Column(name = "mobile")
    private String mobile;

    /** Path to the uploaded player photo */
    @Column(name = "photo_url", length = 500)
    private String photoUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private RegistrationStatus status = RegistrationStatus.PENDING;

    @Column(name = "imported_player_id")
    private Long importedPlayerId;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @PrePersist
    protected void onCreate() {
        submittedAt = LocalDateTime.now();
    }

    public enum RegistrationStatus {
        PENDING, IMPORTED, REJECTED
    }
}
