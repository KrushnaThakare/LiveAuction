package com.cricketauction.util;

import org.springframework.stereotype.Component;

/**
 * Converts any Google Drive share URL to a direct-view URL.
 * Formula that is confirmed working: https://drive.google.com/uc?export=view&id={fileId}
 */
@Component
public class GoogleDriveUtil {

    public String convertToDirectLink(String url) {
        if (url == null || url.isBlank()) return url;

        try {
            if (url.contains("drive.google.com")) {
                String fileId = "";

                if (url.contains("/d/")) {
                    fileId = url.split("/d/")[1].split("/")[0];
                } else if (url.contains("id=")) {
                    fileId = url.split("id=")[1];
                    // strip any trailing query params after the id
                    if (fileId.contains("&")) fileId = fileId.split("&")[0];
                }

                if (!fileId.isBlank()) {
                    return "https://drive.google.com/uc?export=view&id=" + fileId;
                }
            }
        } catch (Exception e) {
            // return original URL on any parse failure
        }

        return url;
    }
}
