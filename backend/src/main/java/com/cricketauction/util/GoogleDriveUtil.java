package com.cricketauction.util;

import org.springframework.stereotype.Component;

/**
 * Converts any Google Drive share URL to a direct uc?export=view URL.
 * This URL works in the browser when the user is logged into Google.
 * (Google blocks server-side downloads without OAuth since late 2024.)
 */
@Component
public class GoogleDriveUtil {

    /**
     * Converts any Drive share URL to thumbnail format.
     * Stored as: https://drive.google.com/thumbnail?id={fileId}&sz=w400-h400
     *
     * The thumbnail endpoint works in <img> tags without login (rate-limited
     * when many load simultaneously — use sequential loading on the frontend).
     */
    public String convertToDirectLink(String url) {
        if (url == null || url.isBlank()) return url;

        try {
            if (url.contains("drive.google.com") || url.contains("lh3.googleusercontent.com")) {
                String fileId = extractFileId(url);
                if (fileId != null && !fileId.isBlank()) {
                    return "https://drive.google.com/thumbnail?id=" + fileId + "&sz=w400-h400";
                }
            }
        } catch (Exception e) {
            // return original on parse failure
        }

        return url;
    }

    public static String extractFileId(String url) {
        if (url == null) return null;
        try {
            if (url.contains("/d/")) {
                String id = url.split("/d/")[1].split("/")[0];
                if (id.contains("?")) id = id.split("\\?")[0];
                return id;
            } else if (url.contains("id=")) {
                String id = url.split("id=")[1];
                if (id.contains("&")) id = id.split("&")[0];
                if (id.contains("?")) id = id.split("\\?")[0];
                return id;
            } else if (url.contains("lh3.googleusercontent.com/d/")) {
                String id = url.split("lh3.googleusercontent.com/d/")[1];
                if (id.contains("=")) id = id.split("=")[0];
                return id;
            }
        } catch (Exception ignored) {}
        return null;
    }
}
