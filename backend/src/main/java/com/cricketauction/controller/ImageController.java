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
     * Trigger a bulk re-download of all player images that are still Drive URLs.
     * Call this after uploading a new Excel file, or to fix images on existing players.
     * Returns count of successfully downloaded images.
     */
    @PostMapping("/tournaments/{tournamentId}/players/download-images")
    public ResponseEntity<ApiResponse<String>> downloadImages(@PathVariable Long tournamentId) {
        List<Player> players = playerRepository.findByTournamentId(tournamentId);
        int downloaded = 0;
        int total = 0;

        for (Player player : players) {
            String url = player.getImageUrl();
            if (url == null || url.isBlank()) continue;
            if (url.startsWith("/api/images/")) continue; // already local
            total++;
            String localUrl = imageDownloadUtil.downloadAndStore(url);
            if (!localUrl.equals(url)) {
                player.setImageUrl(localUrl);
                playerRepository.save(player);
                downloaded++;
            }
        }

        String msg = downloaded + " of " + total + " images downloaded and stored locally";
        log.info("Bulk download for tournament {}: {}", tournamentId, msg);
        return ResponseEntity.ok(ApiResponse.success(msg, msg));
    }
}
