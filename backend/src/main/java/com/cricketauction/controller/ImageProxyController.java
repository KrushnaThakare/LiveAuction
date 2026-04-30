package com.cricketauction.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.util.concurrent.TimeUnit;

/**
 * Proxies Google Drive images through the backend so the browser never
 * makes a direct request to drive.google.com (which returns 403 when the
 * browser isn't logged into Google, because it sends a Referer header and
 * cookies aren't present for drive.google.com in that context).
 *
 * Usage:  GET /api/proxy/image?id={driveFileId}
 *
 * The backend fetches the file from Drive with no browser auth context
 * (just a plain HTTP GET from the server), which works for publicly-shared
 * files, then streams the bytes back to the browser.
 */
@RestController
@RequestMapping("/api/proxy")
public class ImageProxyController {

    private static final Logger log = LoggerFactory.getLogger(ImageProxyController.class);
    private static final int CONNECT_TIMEOUT_MS = 8_000;
    private static final int READ_TIMEOUT_MS    = 15_000;

    @GetMapping("/image")
    public ResponseEntity<byte[]> proxyImage(@RequestParam String id) {
        if (id == null || id.isBlank() || !id.matches("[a-zA-Z0-9_\\-]+")) {
            return ResponseEntity.badRequest().build();
        }

        String driveUrl = "https://drive.google.com/uc?export=view&id=" + id;

        try {
            HttpURLConnection conn = openConnection(driveUrl);
            int status = conn.getResponseCode();

            // Follow up to 5 redirects manually (uc?export=view may redirect to lh3)
            int redirectCount = 0;
            while ((status == 301 || status == 302 || status == 307 || status == 308)
                    && redirectCount < 5) {
                String location = conn.getHeaderField("Location");
                if (location == null) break;
                conn.disconnect();
                conn = openConnection(location);
                status = conn.getResponseCode();
                redirectCount++;
            }

            if (status != 200) {
                log.warn("Drive proxy got HTTP {} for id={}", status, id);
                return ResponseEntity.status(status).build();
            }

            String contentType = conn.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                contentType = "image/jpeg";
            }
            // Strip parameters like "; charset=..." from content type
            if (contentType.contains(";")) contentType = contentType.split(";")[0].trim();

            byte[] imageBytes;
            try (InputStream is = conn.getInputStream()) {
                imageBytes = is.readAllBytes();
            }
            conn.disconnect();

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .cacheControl(CacheControl.maxAge(7, TimeUnit.DAYS).cachePublic())
                    .header(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "*")
                    .body(imageBytes);

        } catch (Exception e) {
            log.error("Image proxy error for id={}: {}", id, e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    private HttpURLConnection openConnection(String url) throws Exception {
        HttpURLConnection conn = (HttpURLConnection) new URI(url).toURL().openConnection();
        conn.setConnectTimeout(CONNECT_TIMEOUT_MS);
        conn.setReadTimeout(READ_TIMEOUT_MS);
        conn.setInstanceFollowRedirects(false);
        // Mimic a browser User-Agent so Google doesn't block the request
        conn.setRequestProperty("User-Agent",
                "Mozilla/5.0 (compatible; CricketAuction/1.0)");
        conn.setRequestProperty("Accept", "image/webp,image/apng,image/*,*/*;q=0.8");
        return conn;
    }
}
