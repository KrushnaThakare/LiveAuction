package com.cricketauction.controller;

import com.cricketauction.dto.ApiResponse;
import com.cricketauction.entity.Player;
import com.cricketauction.repository.PlayerRepository;
import com.cricketauction.util.ImageDownloadUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api")
public class ImageController {

    private static final Logger log = LoggerFactory.getLogger(ImageController.class);

    @Value("${app.images.storage-dir}")
    private String storageDir;

    private final ImageDownloadUtil imageDownloadUtil;
    private final PlayerRepository  playerRepository;

    public ImageController(ImageDownloadUtil imageDownloadUtil, PlayerRepository playerRepository) {
        this.imageDownloadUtil = imageDownloadUtil;
        this.playerRepository  = playerRepository;
    }

    /** Serve a locally-stored player image */
    @GetMapping("/images/{filename:.+}")
    public ResponseEntity<byte[]> serveImage(@PathVariable String filename) {
        try {
            Path file = Paths.get(storageDir, filename);
            if (!Files.exists(file)) {
                return ResponseEntity.notFound().build();
            }
            byte[] bytes = Files.readAllBytes(file);
            String ct = filename.endsWith(".png") ? "image/png"
                      : filename.endsWith(".gif") ? "image/gif"
                      : filename.endsWith(".webp") ? "image/webp"
                      : "image/jpeg";

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(ct))
                    .cacheControl(CacheControl.maxAge(30, TimeUnit.DAYS).cachePublic())
                    .body(bytes);
        } catch (Exception e) {
            log.error("Error serving image {}: {}", filename, e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Accept raw image bytes uploaded from the browser (which is logged into Google
     * so it can fetch Drive images directly). Saves to local storage and returns
     * the local serve URL.
     *
     * Request: multipart/form-data with field "image" (bytes) and "ext" (jpg/png/gif/webp)
     */
    @PostMapping("/images/upload")
    public ResponseEntity<ApiResponse<String>> uploadImageBytes(
            @RequestParam("image") org.springframework.web.multipart.MultipartFile image,
            @RequestParam(value = "ext", defaultValue = "jpg") String ext) {
        try {
            if (image.isEmpty()) return ResponseEntity.badRequest().body(ApiResponse.error("No image data"));
            String safeExt = ext.replaceAll("[^a-zA-Z0-9]", "").toLowerCase();
            if (safeExt.isEmpty()) safeExt = "jpg";
            String filename = java.util.UUID.randomUUID() + "." + safeExt;
            Path dest = Paths.get(storageDir, filename);
            Files.write(dest, image.getBytes());
            String localUrl = "/api/images/" + filename;
            log.info("Browser-uploaded image saved: {}", filename);
            return ResponseEntity.ok(ApiResponse.success("Image saved", localUrl));
        } catch (Exception e) {
            log.error("Image upload error: {}", e.getMessage());
            return ResponseEntity.internalServerError().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Update a single player's image URL (called after browser saves the image).
     */
    @PatchMapping("/tournaments/{tournamentId}/players/{playerId}/image")
    public ResponseEntity<ApiResponse<String>> updatePlayerImage(
            @PathVariable Long tournamentId,
            @PathVariable Long playerId,
            @RequestBody java.util.Map<String, String> body) {
        String newUrl = body.get("imageUrl");
        if (newUrl == null || newUrl.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("imageUrl required"));
        }
        return playerRepository.findById(playerId).map(player -> {
            player.setImageUrl(newUrl);
            playerRepository.save(player);
            return ResponseEntity.ok(ApiResponse.success("Image updated", newUrl));
        }).orElse(ResponseEntity.notFound().build());
    }

    /**
     * Returns list of players in this tournament with their current image URLs
     * so the browser knows which still need downloading.
     */
    @GetMapping("/tournaments/{tournamentId}/players/image-status")
    public ResponseEntity<ApiResponse<java.util.List<java.util.Map<String, Object>>>> getImageStatus(
            @PathVariable Long tournamentId) {
        List<Player> players = playerRepository.findByTournamentId(tournamentId);
        var result = players.stream()
                .filter(p -> p.getImageUrl() != null && !p.getImageUrl().isBlank())
                .map(p -> {
                    java.util.Map<String, Object> m = new java.util.HashMap<>();
                    m.put("id", p.getId());
                    m.put("name", p.getName());
                    m.put("imageUrl", p.getImageUrl());
                    m.put("isLocal", p.getImageUrl().startsWith("/api/images/"));
                    return m;
                })
                .toList();
        return ResponseEntity.ok(ApiResponse.success(result));
    }
}
