package com.cricketauction.util;

import com.cricketauction.entity.Player;
import com.cricketauction.entity.Tournament;
import com.cricketauction.service.PlayerRoleService;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Component
public class ExcelParserUtil {

    private final GoogleDriveUtil googleDriveUtil;
    private final PlayerRoleService playerRoleService;

    public ExcelParserUtil(GoogleDriveUtil googleDriveUtil, PlayerRoleService playerRoleService) {
        this.googleDriveUtil = googleDriveUtil;
        this.playerRoleService = playerRoleService;
    }

    public List<Player> parsePlayersFromExcel(MultipartFile file, Tournament tournament) throws IOException {
        List<Player> players = new ArrayList<>();

        try (Workbook workbook = WorkbookFactory.create(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);

            // Skip header row
            boolean firstRow = true;
            for (Row row : sheet) {
                if (firstRow) {
                    firstRow = false;
                    continue;
                }

                if (isRowEmpty(row)) continue;

                String name = getCellStringValue(row.getCell(0));
                String roleStr = getCellStringValue(row.getCell(1));
                Double basePrice = getCellNumericValue(row.getCell(2));
                String imageUrl = getCellStringValue(row.getCell(3));
                String cricheroesProfileUrl = normalizeCricHeroesProfileUrl(getCellStringValue(row.getCell(4)));

                if (name == null || name.isBlank()) continue;

                String role = playerRoleService.resolveRole(tournament, roleStr);

                if (basePrice == null || basePrice <= 0) basePrice = 1000.0;

                // Convert Drive share URL to direct-view URL stored in DB.
                // The browser renders it directly (user is logged into Google).
                String convertedImageUrl = googleDriveUtil.convertToDirectLink(imageUrl);

                Player player = Player.builder()
                        .name(name.trim())
                        .role(role)
                        .basePrice(basePrice)
                        .currentBid(0.0)
                        .imageUrl(convertedImageUrl)
                        .cricheroesProfileUrl(blankToNull(cricheroesProfileUrl))
                        .cricheroesPlayerId(extractCricHeroesPlayerId(cricheroesProfileUrl))
                        .status(Player.PlayerStatus.AVAILABLE)
                        .tournament(tournament)
                        .build();

                players.add(player);
            }
        }

        return players;
    }

    private boolean isRowEmpty(Row row) {
        if (row == null) return true;
        for (Cell cell : row) {
            if (cell.getCellType() != CellType.BLANK) {
                return false;
            }
        }
        return true;
    }

    private String getCellStringValue(Cell cell) {
        if (cell == null) return null;
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue();
            case NUMERIC -> String.valueOf((long) cell.getNumericCellValue());
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            case FORMULA -> cell.getCellFormula();
            default -> null;
        };
    }

    private Double getCellNumericValue(Cell cell) {
        if (cell == null) return null;
        return switch (cell.getCellType()) {
            case NUMERIC -> cell.getNumericCellValue();
            case STRING -> {
                try {
                    yield Double.parseDouble(cell.getStringCellValue());
                } catch (NumberFormatException e) {
                    yield null;
                }
            }
            default -> null;
        };
    }

    public static String normalizeCricHeroesProfileUrl(String url) {
        if (url == null || url.isBlank()) return null;
        String clean = url.trim();
        if (clean.startsWith("//")) clean = "https:" + clean;
        else if (clean.startsWith("/player-profile/")) clean = "https://cricheroes.com" + clean;
        else if (clean.matches("(?i)^(www\\.)?cricheroes\\.com/player-profile/\\d+.*")) clean = "https://" + clean;

        return isCricHeroesProfileUrl(clean) ? clean : null;
    }

    public static boolean isCricHeroesProfileUrl(String url) {
        if (url == null || url.isBlank()) return false;
        return url.trim().matches("(?i)^https?://(www\\.)?cricheroes\\.com/player-profile/\\d+.*");
    }

    public static Long extractCricHeroesPlayerId(String url) {
        url = normalizeCricHeroesProfileUrl(url);
        if (url == null || url.isBlank()) return null;
        String marker = "/player-profile/";
        int markerIndex = url.indexOf(marker);
        if (markerIndex < 0) return null;
        String rest = url.substring(markerIndex + marker.length());
        String idPart = rest.split("[/?#]")[0];
        try {
            return Long.parseLong(idPart);
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
