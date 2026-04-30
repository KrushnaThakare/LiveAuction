package com.cricketauction.util;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

/**
 * Downloads images from Google Drive (or any public URL) and stores them
 * on the local filesystem.  Images are served via /api/images/{filename}.
 *
 * This completely removes the browser's dependency on drive.google.com —
 * the server does the download once at upload time and the browser only
 * ever loads http://localhost:8080/api/images/xxx.jpg.
 */
@Component
public class ImageDownloadUtil {

    private static final Logger log = LoggerFactory.getLogger(ImageDownloadUtil.class);

    @Value("${app.images.storage-dir}")
    private String storageDir;

    @PostConstruct
    public void init() {
        try {
            Files.createDirectories(Paths.get(storageDir));
            log.info("Image storage: {}", storageDir);
        } catch (Exception e) {
            log.error("Cannot create image directory {}: {}", storageDir, e.getMessage());
        }
    }

    /**
     * Downloads the image at the given URL and returns the local serve URL
     * like /api/images/{uuid}.jpg.  Falls back to the original URL on any error.
     */
    public String downloadAndStore(String url) {
        if (url == null || url.isBlank()) return url;
        // Already a local URL — skip
        if (url.startsWith("/api/images/")) return url;
        // Legacy proxy URL: extract the Drive ID and reconstruct the direct URL
        if (url.contains("/api/proxy/image")) {
            String id = null;
            if (url.contains("id=")) { id = url.split("id=")[1]; if (id.contains("&")) id = id.split("&")[0]; }
            if (id == null || id.isBlank()) return url;
            url = "https://drive.usercontent.google.com/download?id=" + id + "&export=download&confirm=t";
        }

        // Extract Drive file ID if needed, build uc?export=view URL
        String downloadUrl = toDriveDirectUrl(url);

        try {
            byte[] bytes = fetchBytes(downloadUrl);
            if (bytes == null || bytes.length == 0) return url;

            String ext = guessExtension(bytes);
            String filename = UUID.randomUUID() + ext;
            Path dest = Paths.get(storageDir, filename);
            Files.write(dest, bytes);
            log.info("Saved image: {}", filename);
            return "/api/images/" + filename;
        } catch (Exception e) {
            log.warn("Could not download image {}: {}", url, e.getMessage());
            return url; // graceful fallback
        }
    }

    /**
     * Fetch bytes following redirects (Drive uc?export=view redirects to lh3).
     * Skips HTML responses (Drive shows a virus-scan warning page for large files).
     */
    private byte[] fetchBytes(String url) throws Exception {
        String current = url;
        for (int i = 0; i < 6; i++) {
            HttpURLConnection conn = openConn(current);
            int status = conn.getResponseCode();

            if (status == 301 || status == 302 || status == 303 || status == 307 || status == 308) {
                String loc = conn.getHeaderField("Location");
                conn.disconnect();
                if (loc == null) return null;
                current = loc;
                continue;
            }

            if (status != 200) {
                conn.disconnect();
                log.warn("Image download got HTTP {} for {}", status, current);
                return null;
            }

            String ct = conn.getContentType();
            if (ct != null && ct.contains("text/html")) {
                // Drive virus-scan page — try the confirm download URL
                conn.disconnect();
                String confirmUrl = tryConfirmUrl(current);
                if (confirmUrl != null && !confirmUrl.equals(current)) {
                    current = confirmUrl;
                    continue;
                }
                return null;
            }

            try (InputStream is = conn.getInputStream()) {
                byte[] data = is.readAllBytes();
                conn.disconnect();
                return data;
            }
        }
        return null;
    }

    /** For large Drive files, append &confirm=t to bypass the virus warning */
    private String tryConfirmUrl(String url) {
        if (url.contains("drive.google.com")) {
            if (!url.contains("confirm=")) return url + "&confirm=t";
        }
        return null;
    }

    private HttpURLConnection openConn(String url) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URI(url).toURL().openConnection();
        c.setInstanceFollowRedirects(false);
        c.setConnectTimeout(10_000);
        c.setReadTimeout(30_000);
        c.setRequestProperty("User-Agent",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120");
        c.setRequestProperty("Accept", "image/webp,image/apng,image/*,*/*;q=0.8");
        return c;
    }

    private String toDriveDirectUrl(String url) {
        if (!url.contains("drive.google.com") && !url.contains("drive.usercontent.google.com")) return url;
        try {
            String id = null;
            if (url.contains("/d/")) id = url.split("/d/")[1].split("/")[0];
            else if (url.contains("id=")) { id = url.split("id=")[1]; if (id.contains("&")) id = id.split("&")[0]; }
            if (id != null && !id.isBlank()) {
                // drive.usercontent.google.com is Google's new direct download host
                return "https://drive.usercontent.google.com/download?id=" + id + "&export=download&confirm=t";
            }
        } catch (Exception ignored) {}
        return url;
    }

    private String guessExtension(byte[] bytes) {
        if (bytes.length >= 3 &&
                bytes[0] == (byte)0xFF && bytes[1] == (byte)0xD8 && bytes[2] == (byte)0xFF) return ".jpg";
        if (bytes.length >= 4 &&
                bytes[0] == (byte)0x89 && bytes[1] == 'P' && bytes[2] == 'N' && bytes[3] == 'G') return ".png";
        if (bytes.length >= 4 &&
                bytes[0] == 'G' && bytes[1] == 'I' && bytes[2] == 'F') return ".gif";
        if (bytes.length >= 4 &&
                bytes[0] == 'R' && bytes[1] == 'I' && bytes[2] == 'F' && bytes[3] == 'F') return ".webp";
        return ".jpg"; // default
    }
}
