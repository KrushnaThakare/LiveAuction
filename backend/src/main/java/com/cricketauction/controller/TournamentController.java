package com.cricketauction.controller;

import com.cricketauction.dto.ApiResponse;
import com.cricketauction.dto.TournamentRequest;
import com.cricketauction.dto.TournamentResponse;
import com.cricketauction.service.FileStorageService;
import com.cricketauction.service.TournamentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/tournaments")
public class TournamentController {

    private final TournamentService  tournamentService;
    private final FileStorageService fileStorage;

    public TournamentController(TournamentService tournamentService, FileStorageService fileStorage) {
        this.tournamentService = tournamentService;
        this.fileStorage       = fileStorage;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<TournamentResponse>> createTournament(
            @Valid @RequestBody TournamentRequest request) {
        TournamentResponse response = tournamentService.createTournament(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tournament created successfully", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<TournamentResponse>>> getAllTournaments() {
        return ResponseEntity.ok(ApiResponse.success(tournamentService.getAllTournaments()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<TournamentResponse>> getTournamentById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(tournamentService.getTournamentById(id)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<TournamentResponse>> updateTournament(
            @PathVariable Long id,
            @Valid @RequestBody TournamentRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Tournament updated",
                tournamentService.updateTournament(id, request)));
    }

    /** Upload / replace tournament logo */
    @PostMapping("/{id}/logo")
    public ResponseEntity<ApiResponse<String>> uploadLogo(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file) {
        try {
            String url = fileStorage.saveTournamentBanner(file); // reuse tournaments/ dir
            var t = tournamentService.findById(id);
            t.setLogoUrl(url);
            tournamentService.saveTournament(t);
            return ResponseEntity.ok(ApiResponse.success("Logo uploaded", url));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteTournament(@PathVariable Long id) {
        tournamentService.deleteTournament(id);
        return ResponseEntity.ok(ApiResponse.success("Tournament deleted", null));
    }
}
