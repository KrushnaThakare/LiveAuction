package com.cricketauction.controller;

import com.cricketauction.dto.ApiResponse;
import com.cricketauction.dto.PlayerResponse;
import com.cricketauction.dto.RegistrationResponse;
import com.cricketauction.dto.FormSectionDto;
import com.cricketauction.entity.Tournament;
import com.cricketauction.service.PlayerRegistrationService;
import com.cricketauction.service.RegistrationFormService;
import com.cricketauction.service.TournamentService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/registration")
public class PlayerRegistrationController {

    private final PlayerRegistrationService regService;
    private final RegistrationFormService formService;
    private final TournamentService tournamentService;

    public PlayerRegistrationController(PlayerRegistrationService regService,
                                        RegistrationFormService formService,
                                        TournamentService tournamentService) {
        this.regService = regService;
        this.formService = formService;
        this.tournamentService = tournamentService;
    }



    /** Public — fetch registration page data in one call */
    @GetMapping("/{tournamentId}/form")
    public ResponseEntity<ApiResponse<PublicRegistrationPayload>> publicForm(@PathVariable Long tournamentId) {
        Tournament t = tournamentService.findById(tournamentId);
        List<FormSectionDto> sections = formService.getForm(tournamentId);
        PublicRegistrationPayload payload = new PublicRegistrationPayload(
                t.getId(), t.getName(), t.getRegistrationEnabled(),
                t.getRegistrationMessage(), t.getRegistrationRedirectLink(), t.getBannerUrl(),
                sections
        );
        return ResponseEntity.ok(ApiResponse.success(payload));
    }

    /** Public — submit registration form */
    @PostMapping("/{tournamentId}")
    public ResponseEntity<ApiResponse<RegistrationResponse>> submit(
            @PathVariable Long tournamentId,
            @RequestParam("formData") String formData,
            @RequestParam(value = "playerName", required = false) String playerName,
            @RequestParam(value = "mobile", required = false) String mobile,
            @RequestParam(value = "photo", required = false) MultipartFile photo) {
        RegistrationResponse resp = regService.submit(tournamentId, formData, playerName, mobile, photo);
        return ResponseEntity.ok(ApiResponse.success("Registration submitted successfully", resp));
    }

    /** Admin — list all registrations for a tournament */
    @GetMapping("/{tournamentId}")
    public ResponseEntity<ApiResponse<List<RegistrationResponse>>> getAll(
            @PathVariable Long tournamentId) {
        return ResponseEntity.ok(ApiResponse.success(regService.getAll(tournamentId)));
    }



    /** Admin/Operator — export all registrations as Excel */
    @GetMapping("/{tournamentId}/export")
    public ResponseEntity<byte[]> exportExcel(@PathVariable Long tournamentId) {
        byte[] bytes = regService.exportRegistrationsExcel(tournamentId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=registrations-" + tournamentId + ".xlsx")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(bytes);
    }

    /** Admin — import one registration to auction (no extra params, defaults to basePrice=1000) */
    @PostMapping("/{tournamentId}/import/{registrationId}")
    public ResponseEntity<ApiResponse<PlayerResponse>> importOne(
            @PathVariable Long tournamentId,
            @PathVariable Long registrationId) {
        return ResponseEntity.ok(ApiResponse.success(
                "Player imported", regService.importToAuction(registrationId, null, 1000.0)));
    }

    /** Admin — bulk import all pending registrations (base price = 1000) */
    @PostMapping("/{tournamentId}/import-all")
    public ResponseEntity<ApiResponse<String>> importAll(@PathVariable Long tournamentId) {
        int count = regService.bulkImport(tournamentId, 1000.0);
        return ResponseEntity.ok(ApiResponse.success(count + " players imported to auction", String.valueOf(count)));
    }

    /** Admin — edit registration details + optional new photo */
    @PatchMapping(value = "/{tournamentId}/{registrationId}",
                  consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<RegistrationResponse>> editRegistration(
            @PathVariable Long tournamentId,
            @PathVariable Long registrationId,
            @RequestParam(value = "formData",   required = false) String formData,
            @RequestParam(value = "playerName", required = false) String playerName,
            @RequestParam(value = "mobile",     required = false) String mobile,
            @RequestParam(value = "photo",      required = false) MultipartFile photo) {
        return ResponseEntity.ok(ApiResponse.success(
                "Registration updated",
                regService.editRegistration(registrationId, formData, playerName, mobile, photo)));
    }

    /** Admin — delete a registration */
    @DeleteMapping("/{tournamentId}/{registrationId}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Long tournamentId, @PathVariable Long registrationId) {
        regService.deleteRegistration(registrationId);
        return ResponseEntity.ok(ApiResponse.success("Registration deleted", null));
    }

    record PublicRegistrationPayload(
            Long tournamentId,
            String tournamentName,
            Boolean registrationEnabled,
            String registrationMessage,
            String registrationRedirectLink,
            String bannerUrl,
            List<FormSectionDto> sections
    ) {}
}

