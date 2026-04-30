package com.cricketauction.util;

import org.springframework.stereotype.Component;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class GoogleDriveUtil {

    private static final Pattern DRIVE_FILE_PATTERN =
            Pattern.compile("https://drive\\.google\\.com/file/d/([^/]+)");
    private static final Pattern DRIVE_OPEN_PATTERN =
            Pattern.compile("https://drive\\.google\\.com/open\\?id=([^&]+)");
    private static final Pattern DRIVE_UC_PATTERN =
            Pattern.compile("https://drive\\.google\\.com/uc\\?.*id=([^&]+)");

    public String convertToDirectLink(String url) {
        if (url == null || url.isBlank()) {
            return url;
        }

        String fileId = extractFileId(url);
        if (fileId != null) {
            // thumbnail API works reliably for publicly shared files across browsers
            return "https://drive.google.com/thumbnail?id=" + fileId + "&sz=w400-h400";
        }

        return url;
    }

    private String extractFileId(String url) {
        Matcher matcher = DRIVE_FILE_PATTERN.matcher(url);
        if (matcher.find()) {
            return matcher.group(1);
        }

        matcher = DRIVE_OPEN_PATTERN.matcher(url);
        if (matcher.find()) {
            return matcher.group(1);
        }

        matcher = DRIVE_UC_PATTERN.matcher(url);
        if (matcher.find()) {
            return matcher.group(1);
        }

        return null;
    }
}
