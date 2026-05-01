package com.cricketauction.controller;

import com.cricketauction.dto.ApiResponse;
import com.cricketauction.dto.PlayerResponse;
import com.cricketauction.dto.RegistrationResponse;
import com.cricketauction.service.PlayerRegistrationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/registration")
public class PlayerRegistrationController {

    private final PlayerRegistrationService regService;

    public PlayerRegistrationController(PlayerRegistrationService regService) {
        this.regService = regService;
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

    /** Admin — import one registration to auction */
    @PostMapping("/{tournamentId}/import/{registrationId}")
    public ResponseEntity<ApiResponse<PlayerResponse>> importOne(
            @PathVariable Long tournamentId,
            @PathVariable Long registrationId,
            @RequestBody Map<String, Object> body) {
        String role = (String) body.getOrDefault("role", "BATSMAN");
        Double basePrice = body.get("basePrice") != null
                ? Double.parseDouble(body.get("basePrice").toString()) : 1000.0;
        return ResponseEntity.ok(ApiResponse.success(
                "Player imported", regService.importToAuction(registrationId, role, basePrice)));
    }

    /** Admin — bulk import all pending registrations */
    @PostMapping("/{tournamentId}/import-all")
    public ResponseEntity<ApiResponse<String>> importAll(
            @PathVariable Long tournamentId,
            @RequestBody Map<String, Object> body) {
        Double basePrice = body.get("basePrice") != null
                ? Double.parseDouble(body.get("basePrice").toString()) : 1000.0;
        int count = regService.bulkImport(tournamentId, basePrice);
        return ResponseEntity.ok(ApiResponse.success(count + " players imported to auction", String.valueOf(count)));
    }

    /** Admin — delete a registration */
    @DeleteMapping("/{tournamentId}/{registrationId}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Long tournamentId, @PathVariable Long registrationId) {
        regService.deleteRegistration(registrationId);
        return ResponseEntity.ok(ApiResponse.success("Registration deleted", null));
    }
}
