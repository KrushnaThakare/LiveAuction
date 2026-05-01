package com.cricketauction.service;

import com.cricketauction.dto.FormSectionDto;
import com.cricketauction.dto.FormSectionDto.FormFieldDto;
import com.cricketauction.entity.FormField;
import com.cricketauction.entity.FormSection;
import com.cricketauction.entity.Tournament;
import com.cricketauction.exception.ResourceNotFoundException;
import com.cricketauction.repository.FormFieldRepository;
import com.cricketauction.repository.FormSectionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;

@Service
@Transactional
public class RegistrationFormService {

    private final FormSectionRepository sectionRepo;
    private final FormFieldRepository fieldRepo;
    private final TournamentService tournamentService;

    public RegistrationFormService(FormSectionRepository sectionRepo,
                                   FormFieldRepository fieldRepo,
                                   TournamentService tournamentService) {
        this.sectionRepo = sectionRepo;
        this.fieldRepo = fieldRepo;
        this.tournamentService = tournamentService;
    }

    @Transactional(readOnly = true)
    public List<FormSectionDto> getForm(Long tournamentId) {
        return sectionRepo.findByTournamentIdOrderByPositionAsc(tournamentId)
                .stream().map(this::mapSection).toList();
    }

    public FormSectionDto createSection(Long tournamentId, FormSectionDto dto) {
        Tournament t = tournamentService.findById(tournamentId);
        FormSection section = FormSection.builder()
                .tournament(t)
                .title(dto.getTitle())
                .description(dto.getDescription())
                .position(dto.getPosition() != null ? dto.getPosition() : nextSectionPos(tournamentId))
                .build();
        return mapSection(sectionRepo.save(section));
    }

    public FormSectionDto updateSection(Long sectionId, FormSectionDto dto) {
        FormSection section = sectionRepo.findById(sectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Section", sectionId));
        section.setTitle(dto.getTitle());
        section.setDescription(dto.getDescription());
        if (dto.getPosition() != null) section.setPosition(dto.getPosition());
        return mapSection(sectionRepo.save(section));
    }

    public void deleteSection(Long sectionId) {
        sectionRepo.deleteById(sectionId);
    }

    public FormFieldDto addField(Long tournamentId, FormFieldDto dto) {
        Tournament t = tournamentService.findById(tournamentId);
        FormSection section = dto.getSectionId() != null
                ? sectionRepo.findById(dto.getSectionId()).orElse(null) : null;

        String opts = dto.getOptions() != null ? String.join(",", dto.getOptions()) : null;
        FormField field = FormField.builder()
                .tournament(t).section(section)
                .fieldKey(dto.getFieldKey())
                .label(dto.getLabel())
                .type(dto.getType())
                .required(dto.getRequired() != null && dto.getRequired())
                .placeholder(dto.getPlaceholder())
                .defaultValue(dto.getDefaultValue())
                .options(opts)
                .position(dto.getPosition() != null ? dto.getPosition() : nextFieldPos(tournamentId))
                .mapsToPlayerField(dto.getMapsToPlayerField())
                .build();
        return mapField(fieldRepo.save(field));
    }

    public FormFieldDto updateField(Long fieldId, FormFieldDto dto) {
        FormField f = fieldRepo.findById(fieldId)
                .orElseThrow(() -> new ResourceNotFoundException("Field", fieldId));
        f.setLabel(dto.getLabel());
        f.setRequired(dto.getRequired() != null && dto.getRequired());
        f.setPlaceholder(dto.getPlaceholder());
        f.setDefaultValue(dto.getDefaultValue());
        if (dto.getOptions() != null) f.setOptions(String.join(",", dto.getOptions()));
        if (dto.getPosition() != null) f.setPosition(dto.getPosition());
        if (dto.getMapsToPlayerField() != null) f.setMapsToPlayerField(dto.getMapsToPlayerField());
        if (dto.getSectionId() != null) {
            sectionRepo.findById(dto.getSectionId()).ifPresent(f::setSection);
        }
        return mapField(fieldRepo.save(f));
    }

    public void deleteField(Long fieldId) {
        fieldRepo.deleteById(fieldId);
    }

    private int nextSectionPos(Long tid) {
        return sectionRepo.findByTournamentIdOrderByPositionAsc(tid).size();
    }

    private int nextFieldPos(Long tid) {
        return fieldRepo.findByTournamentIdOrderByPositionAsc(tid).size();
    }

    private FormSectionDto mapSection(FormSection s) {
        return FormSectionDto.builder()
                .id(s.getId()).title(s.getTitle()).description(s.getDescription())
                .position(s.getPosition())
                .fields(s.getFields().stream().map(this::mapField).toList())
                .build();
    }

    private FormFieldDto mapField(FormField f) {
        List<String> opts = (f.getOptions() != null && !f.getOptions().isBlank())
                ? Arrays.asList(f.getOptions().split(",")) : List.of();
        return FormFieldDto.builder()
                .id(f.getId()).fieldKey(f.getFieldKey()).label(f.getLabel())
                .type(f.getType()).required(Boolean.TRUE.equals(f.getRequired()))
                .placeholder(f.getPlaceholder()).defaultValue(f.getDefaultValue())
                .options(opts).position(f.getPosition())
                .mapsToPlayerField(f.getMapsToPlayerField())
                .sectionId(f.getSection() != null ? f.getSection().getId() : null)
                .build();
    }
}
