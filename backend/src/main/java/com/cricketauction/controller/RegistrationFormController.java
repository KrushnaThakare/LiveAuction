package com.cricketauction.controller;

import com.cricketauction.dto.ApiResponse;
import com.cricketauction.dto.FormSectionDto;
import com.cricketauction.dto.FormSectionDto.FormFieldDto;
import com.cricketauction.dto.TournamentRegistrationSettings;
import com.cricketauction.entity.Tournament;
import com.cricketauction.service.FileStorageService;
import com.cricketauction.service.RegistrationFormService;
import com.cricketauction.service.TournamentService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/tournaments/{tournamentId}/registration")
public class RegistrationFormController {

    private final RegistrationFormService formService;
    private final TournamentService tournamentService;
    private final FileStorageService fileStorage;

    public RegistrationFormController(RegistrationFormService formService,
                                      TournamentService tournamentService,
                                      FileStorageService fileStorage) {
        this.formService = formService;
        this.tournamentService = tournamentService;
        this.fileStorage = fileStorage;
    }

    /** Get full form structure (sections + fields) */
    @GetMapping("/form")
    public ResponseEntity<ApiResponse<List<FormSectionDto>>> getForm(@PathVariable Long tournamentId) {
        return ResponseEntity.ok(ApiResponse.success(formService.getForm(tournamentId)));
    }

    /** Get tournament registration settings */
    @GetMapping("/settings")
    public ResponseEntity<ApiResponse<TournamentSettingsResponse>> getSettings(@PathVariable Long tournamentId) {
        Tournament t = tournamentService.findById(tournamentId);
        return ResponseEntity.ok(ApiResponse.success(TournamentSettingsResponse.from(t)));
    }

    /** Update registration settings */
    @PutMapping("/settings")
    public ResponseEntity<ApiResponse<String>> updateSettings(
            @PathVariable Long tournamentId,
            @RequestBody TournamentRegistrationSettings settings) {
        Tournament t = tournamentService.findById(tournamentId);
        if (settings.getRegistrationEnabled() != null)
            t.setRegistrationEnabled(settings.getRegistrationEnabled());
        if (settings.getRegistrationMessage() != null)
            t.setRegistrationMessage(settings.getRegistrationMessage());
        if (settings.getRegistrationRedirectLink() != null)
            t.setRegistrationRedirectLink(settings.getRegistrationRedirectLink());
        tournamentService.saveTournament(t);
        return ResponseEntity.ok(ApiResponse.success("Settings updated", "ok"));
    }

    /** Upload a static image (QR code, UPI scanner etc.) for use in a STATIC_IMAGE field */
    @PostMapping("/static-image")
    public ResponseEntity<ApiResponse<String>> uploadStaticImage(
            @PathVariable Long tournamentId,
            @RequestParam("file") MultipartFile file) {
        try {
            String url = fileStorage.saveTournamentBanner(file); // reuse same dir
            return ResponseEntity.ok(ApiResponse.success("Image uploaded", url));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /** Upload tournament banner */
    @PostMapping("/banner")
    public ResponseEntity<ApiResponse<String>> uploadBanner(
            @PathVariable Long tournamentId,
            @RequestParam("file") MultipartFile file) {
        try {
            String url = fileStorage.saveTournamentBanner(file);
            Tournament t = tournamentService.findById(tournamentId);
            t.setBannerUrl(url);
            tournamentService.saveTournament(t);
            return ResponseEntity.ok(ApiResponse.success("Banner uploaded", url));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    // ── Sections ──────────────────────────────────────────────────────────────
    @PostMapping("/sections")
    public ResponseEntity<ApiResponse<FormSectionDto>> createSection(
            @PathVariable Long tournamentId, @RequestBody FormSectionDto dto) {
        return ResponseEntity.ok(ApiResponse.success(formService.createSection(tournamentId, dto)));
    }

    @PutMapping("/sections/{sectionId}")
    public ResponseEntity<ApiResponse<FormSectionDto>> updateSection(
            @PathVariable Long tournamentId, @PathVariable Long sectionId,
            @RequestBody FormSectionDto dto) {
        return ResponseEntity.ok(ApiResponse.success(formService.updateSection(sectionId, dto)));
    }

    @DeleteMapping("/sections/{sectionId}")
    public ResponseEntity<ApiResponse<Void>> deleteSection(
            @PathVariable Long tournamentId, @PathVariable Long sectionId) {
        formService.deleteSection(sectionId);
        return ResponseEntity.ok(ApiResponse.success("Section deleted", null));
    }

    // ── Fields ────────────────────────────────────────────────────────────────
    @PostMapping("/fields")
    public ResponseEntity<ApiResponse<FormFieldDto>> addField(
            @PathVariable Long tournamentId, @RequestBody FormFieldDto dto) {
        return ResponseEntity.ok(ApiResponse.success(formService.addField(tournamentId, dto)));
    }

    @PutMapping("/fields/{fieldId}")
    public ResponseEntity<ApiResponse<FormFieldDto>> updateField(
            @PathVariable Long tournamentId, @PathVariable Long fieldId,
            @RequestBody FormFieldDto dto) {
        return ResponseEntity.ok(ApiResponse.success(formService.updateField(fieldId, dto)));
    }

    @DeleteMapping("/fields/{fieldId}")
    public ResponseEntity<ApiResponse<Void>> deleteField(
            @PathVariable Long tournamentId, @PathVariable Long fieldId) {
        formService.deleteField(fieldId);
        return ResponseEntity.ok(ApiResponse.success("Field deleted", null));
    }

    record TournamentSettingsResponse(
            Boolean registrationEnabled,
            String registrationMessage,
            String registrationRedirectLink,
            String bannerUrl
    ) {
        static TournamentSettingsResponse from(Tournament t) {
            return new TournamentSettingsResponse(
                    t.getRegistrationEnabled(),
                    t.getRegistrationMessage(),
                    t.getRegistrationRedirectLink(),
                    t.getBannerUrl());
        }
    }
}
