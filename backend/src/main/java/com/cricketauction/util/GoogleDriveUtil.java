package com.cricketauction.util;

import org.springframework.stereotype.Component;

/**
 * Converts any Google Drive share URL to a backend proxy URL.
 * The proxy endpoint (GET /api/proxy/image?id={fileId}) fetches the image
 * server-side and streams it to the browser, bypassing the 403 that
 * direct drive.google.com/uc?export=view requests get in browser context.
 */
@Component
public class GoogleDriveUtil {

    public String convertToDirectLink(String url) {
        if (url == null || url.isBlank()) return url;

        try {
            if (url.contains("drive.google.com")) {
                String fileId = extractFileId(url);
                if (fileId != null && !fileId.isBlank()) {
                    // Store proxy URL — backend will fetch from Drive at render time
                    return "/api/proxy/image?id=" + fileId;
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
                return url.split("/d/")[1].split("/")[0];
            } else if (url.contains("id=")) {
                String id = url.split("id=")[1];
                if (id.contains("&")) id = id.split("&")[0];
                return id;
            }
        } catch (Exception e) {
            // ignore
        }
        return null;
    }
}
