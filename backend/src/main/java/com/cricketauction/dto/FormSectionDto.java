package com.cricketauction.dto;

import com.cricketauction.entity.FormField;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class FormSectionDto {
    private Long id;
    private String title;
    private String description;
    private Integer position;
    private List<FormFieldDto> fields;

    @Data
    @Builder
    public static class FormFieldDto {
        private Long id;
        private String fieldKey;
        private String label;
        private FormField.FieldType type;
        private Boolean required;
        private String placeholder;
        private String defaultValue;
        private List<String> options;
        private Object validationRules;
        private Integer position;
        private String mapsToPlayerField;
        private Long sectionId;
    }
}
