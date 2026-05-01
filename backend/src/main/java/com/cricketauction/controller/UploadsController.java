package com.cricketauction.controller;

import com.cricketauction.service.FileStorageService;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.TimeUnit;

/**
 * Serves uploaded files (player photos, tournament banners).
 * Handles paths like /api/uploads/players/{tid}/{filename}
 */
@RestController
@RequestMapping("/api/uploads")
public class UploadsController {

    private final FileStorageService fileStorage;

    public UploadsController(FileStorageService fileStorage) {
        this.fileStorage = fileStorage;
    }

    @GetMapping("/**")
    public ResponseEntity<byte[]> serveFile(@RequestParam(name = "_path", required = false) String ignored,
                                             jakarta.servlet.http.HttpServletRequest request) {
        String urlPath = "/api/uploads" + request.getRequestURI().split("/api/uploads")[1];
        try {
            Path file = fileStorage.resolvePath(urlPath);
            if (!Files.exists(file)) return ResponseEntity.notFound().build();

            byte[] bytes = Files.readAllBytes(file);
            String name = file.getFileName().toString().toLowerCase();
            String ct = name.endsWith(".png") ? "image/png"
                      : name.endsWith(".gif") ? "image/gif"
                      : name.endsWith(".webp") ? "image/webp"
                      : "image/jpeg";

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(ct))
                    .cacheControl(CacheControl.maxAge(30, TimeUnit.DAYS).cachePublic())
                    .body(bytes);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
