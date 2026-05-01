package com.cricketauction.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Service
public class FileStorageService {

    private static final Logger log = LoggerFactory.getLogger(FileStorageService.class);

    @Value("${app.upload.base-dir:${user.home}/cricket-auction-uploads}")
    private String baseDir;

    @PostConstruct
    public void init() {
        try {
            Files.createDirectories(Paths.get(baseDir, "tournaments"));
            Files.createDirectories(Paths.get(baseDir, "players"));
            log.info("Upload directories ready at: {}", baseDir);
        } catch (IOException e) {
            log.error("Cannot create upload directories: {}", e.getMessage());
        }
    }

    public String savePlayerPhoto(Long tournamentId, MultipartFile file) throws IOException {
        return saveFile(file, "players/" + tournamentId);
    }

    public String saveTournamentBanner(MultipartFile file) throws IOException {
        return saveFile(file, "tournaments");
    }

    private String saveFile(MultipartFile file, String subDir) throws IOException {
        if (file == null || file.isEmpty()) return null;

        Path dir = Paths.get(baseDir, subDir);
        Files.createDirectories(dir);

        String originalName = file.getOriginalFilename();
        String ext = (originalName != null && originalName.contains("."))
                ? originalName.substring(originalName.lastIndexOf(".")).toLowerCase()
                : ".jpg";
        // Only allow image extensions
        if (!ext.matches("\\.(jpg|jpeg|png|gif|webp)")) ext = ".jpg";

        String filename = UUID.randomUUID() + ext;
        Path dest = dir.resolve(filename);
        file.transferTo(dest);

        return "/api/uploads/" + subDir + "/" + filename;
    }

    public Path resolvePath(String urlPath) {
        // Convert /api/uploads/... → absolute path
        String relative = urlPath.replace("/api/uploads/", "");
        return Paths.get(baseDir, relative);
    }

    public void deleteFile(String urlPath) {
        if (urlPath == null) return;
        try {
            Path p = resolvePath(urlPath);
            Files.deleteIfExists(p);
        } catch (Exception e) {
            log.warn("Could not delete file {}: {}", urlPath, e.getMessage());
        }
    }
}
