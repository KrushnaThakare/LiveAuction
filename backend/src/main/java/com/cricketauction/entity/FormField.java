package com.cricketauction.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "form_fields")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FormField {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tournament_id", nullable = false)
    private Tournament tournament;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "section_id")
    private FormSection section;

    @Column(name = "field_key", nullable = false)
    private String fieldKey;

    @Column(nullable = false)
    private String label;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FieldType type;

    @Column(nullable = false)
    @Builder.Default
    private Boolean required = false;

    private String placeholder;

    @Column(name = "default_value")
    private String defaultValue;

    /** Comma-separated options for dropdown / checkbox / radio */
    @Column(length = 2000)
    private String options;

    /** JSON validation rules: {"minLength":2,"maxLength":50,"regex":"..."} */
    @Column(length = 1000)
    private String validationRules;

    @Column(nullable = false)
    @Builder.Default
    private Integer position = 0;

    /** Maps to auction player fields: name, role, basePrice */
    @Column(name = "maps_to_player_field")
    private String mapsToPlayerField;

    public enum FieldType {
        TEXT, NUMBER, TEXTAREA, DROPDOWN, MULTI_SELECT,
        CHECKBOX_GROUP, RADIO, FILE_UPLOAD, PHONE, EMAIL
    }
}
