package com.cricketauction.controller;

import com.cricketauction.util.ImageDownloadUtil;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Kept for backward compatibility with any stored /api/proxy/image?id= URLs.
 * Downloads the image locally on first access and returns it.
 */
@RestController
@RequestMapping("/api/proxy")
public class ImageProxyController {

    private final ImageDownloadUtil imageDownloadUtil;
    private final ImageController   imageController;

    public ImageProxyController(ImageDownloadUtil imageDownloadUtil,
                                ImageController imageController) {
        this.imageDownloadUtil = imageDownloadUtil;
        this.imageController   = imageController;
    }

    @GetMapping("/image")
    public ResponseEntity<byte[]> proxyImage(@RequestParam String id) {
        // Download to local storage and redirect to the local URL
        String localUrl = imageDownloadUtil.downloadAndStore(
                "https://drive.google.com/uc?export=view&id=" + id);
        if (localUrl.startsWith("/api/images/")) {
            String filename = localUrl.replace("/api/images/", "");
            return imageController.serveImage(filename);
        }
        return ResponseEntity.notFound().build();
    }
}
