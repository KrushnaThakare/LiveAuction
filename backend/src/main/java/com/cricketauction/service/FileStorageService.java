package com.cricketauction.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
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
import java.util.Map;
import java.util.UUID;

@Service
public class FileStorageService {

    private static final Logger log = LoggerFactory.getLogger(FileStorageService.class);

    @Value("${app.upload.base-dir:${user.home}/cricket-auction-uploads}")
    private String baseDir;

    @Value("${cloudinary.cloud-name:}")
    private String cloudName;

    @Value("${cloudinary.api-key:}")
    private String apiKey;

    @Value("${cloudinary.api-secret:}")
    private String apiSecret;

    private Cloudinary cloudinary;

    @PostConstruct
    public void init() {
        try {
            Files.createDirectories(Paths.get(baseDir, "tournaments"));
            Files.createDirectories(Paths.get(baseDir, "players"));
            if (!cloudName.isBlank() && !apiKey.isBlank() && !apiSecret.isBlank()) {
                cloudinary = new Cloudinary(ObjectUtils.asMap(
                        "cloud_name", cloudName,
                        "api_key", apiKey,
                        "api_secret", apiSecret,
                        "secure", true
                ));
                log.info("Cloudinary upload enabled");
            } else {
                log.warn("Cloudinary not configured; using local filesystem uploads");
            }
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

        String originalName = file.getOriginalFilename();
        String ext = (originalName != null && originalName.contains("."))
                ? originalName.substring(originalName.lastIndexOf(".")).toLowerCase()
                : ".jpg";
        if (!ext.matches("\\.(jpg|jpeg|png|gif|webp)")) ext = ".jpg";

        if (cloudinary != null) {
            try {
                @SuppressWarnings("unchecked")
                Map<String, Object> uploaded = cloudinary.uploader().upload(
                        file.getBytes(),
                        ObjectUtils.asMap(
                                "folder", "cricket-auction/" + subDir,
                                "resource_type", "image",
                                "use_filename", false,
                                "unique_filename", true
                        )
                );
                Object secureUrl = uploaded.get("secure_url");
                if (secureUrl != null) return secureUrl.toString();
            } catch (Exception e) {
                log.warn("Cloudinary upload failed, falling back to local storage: {}", e.getMessage());
            }
        }

        Path dir = Paths.get(baseDir, subDir);
        Files.createDirectories(dir);
        String filename = UUID.randomUUID() + ext;
        Path dest = dir.resolve(filename);
        file.transferTo(dest);
        return "/api/uploads/" + subDir + "/" + filename;
    }

    public Path resolvePath(String urlPath) {
        // Convert /api/uploads/... → absolute path
        if (urlPath == null || urlPath.startsWith("http://") || urlPath.startsWith("https://")) {
            return null;
        }
        String relative = urlPath.replace("/api/uploads/", "");
        return Paths.get(baseDir, relative);
    }

    public void deleteFile(String urlPath) {
        if (urlPath == null) return;
        try {
            Path p = resolvePath(urlPath);
            if (p != null) Files.deleteIfExists(p);
        } catch (Exception e) {
            log.warn("Could not delete file {}: {}", urlPath, e.getMessage());
        }
    }
}
