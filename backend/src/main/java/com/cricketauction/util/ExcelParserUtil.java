package com.cricketauction.util;

import com.cricketauction.entity.Player;
import com.cricketauction.entity.Tournament;
import com.cricketauction.service.PlayerRoleService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.poi.ss.usermodel.*;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Component
public class ExcelParserUtil {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

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
            if (sheet == null) return players;

            Row headerRow = sheet.getRow(0);
            if (headerRow == null) return players;

            Map<Integer, KnownColumn> knownColumns = new LinkedHashMap<>();
            Map<Integer, String> extraColumnLabels = new LinkedHashMap<>();

            for (Cell cell : headerRow) {
                if (cell == null) continue;
                int index = cell.getColumnIndex();
                String headerLabel = blankToNull(formatCellValue(cell));
                if (headerLabel == null) continue;

                KnownColumn kind = resolveKnownColumn(headerLabel);
                if (kind != null) {
                    knownColumns.putIfAbsent(index, kind);
                } else {
                    extraColumnLabels.put(index, headerLabel);
                }
            }

            boolean hasNameColumn = knownColumns.containsValue(KnownColumn.NAME);
            int startRow = 1;

            if (!hasNameColumn) {
                knownColumns.clear();
                extraColumnLabels.clear();
                knownColumns.put(0, KnownColumn.NAME);
                knownColumns.put(1, KnownColumn.ROLE);
                knownColumns.put(2, KnownColumn.BASE_PRICE);
                knownColumns.put(3, KnownColumn.IMAGE_URL);
                knownColumns.put(4, KnownColumn.CRICHEROES_URL);
                startRow = 0;
            }

            DataFormatter formatter = new DataFormatter();
            for (int rowIndex = startRow; rowIndex <= sheet.getLastRowNum(); rowIndex++) {
                Row row = sheet.getRow(rowIndex);
                if (isRowEmpty(row)) continue;

                String name = null;
                String roleStr = null;
                Double basePrice = null;
                String imageUrl = null;
                String cricheroesProfileUrl = null;
                LinkedHashMap<String, String> extras = new LinkedHashMap<>();

                for (Map.Entry<Integer, KnownColumn> entry : knownColumns.entrySet()) {
                    String value = blankToNull(formatCellValue(row.getCell(entry.getKey()), formatter));
                    switch (entry.getValue()) {
                        case NAME -> name = value;
                        case ROLE -> roleStr = value;
                        case BASE_PRICE -> basePrice = parseNumericValue(row.getCell(entry.getKey()));
                        case IMAGE_URL -> imageUrl = value;
                        case CRICHEROES_URL -> cricheroesProfileUrl = value;
                        default -> { }
                    }
                }

                for (Map.Entry<Integer, String> entry : extraColumnLabels.entrySet()) {
                    String value = blankToNull(formatCellValue(row.getCell(entry.getKey()), formatter));
                    if (value != null) extras.put(entry.getValue(), value);
                }

                if (name == null || name.isBlank()) continue;

                String role = playerRoleService.resolveRole(tournament, roleStr);
                if (basePrice == null || basePrice <= 0) basePrice = 1000.0;

                String convertedImageUrl = googleDriveUtil.convertToDirectLink(imageUrl);
                String extraDataJson = extras.isEmpty() ? null : OBJECT_MAPPER.writeValueAsString(extras);

                Player player = Player.builder()
                        .name(name.trim())
                        .role(role)
                        .basePrice(basePrice)
                        .currentBid(0.0)
                        .imageUrl(convertedImageUrl)
                        .cricheroesProfileUrl(blankToNull(normalizeCricHeroesProfileUrl(cricheroesProfileUrl)))
                        .cricheroesPlayerId(extractCricHeroesPlayerId(cricheroesProfileUrl))
                        .status(Player.PlayerStatus.AVAILABLE)
                        .tournament(tournament)
                        .extraData(extraDataJson)
                        .build();

                players.add(player);
            }
        }

        return players;
    }

    private enum KnownColumn {
        NAME, ROLE, BASE_PRICE, IMAGE_URL, CRICHEROES_URL
    }

    private KnownColumn resolveKnownColumn(String headerLabel) {
        String normalized = normalizeHeader(headerLabel);
        return switch (normalized) {
            case "name", "playername", "player" -> KnownColumn.NAME;
            case "role", "playerrole" -> KnownColumn.ROLE;
            case "baseprice", "price", "base" -> KnownColumn.BASE_PRICE;
            case "imageurl", "image", "photo", "photourl", "playerphoto" -> KnownColumn.IMAGE_URL;
            case "cricheroesprofileurl", "cricheroesurl", "cricheroes", "cricheroesprofile", "crhprofile", "crh" ->
                    KnownColumn.CRICHEROES_URL;
            default -> null;
        };
    }

    private String normalizeHeader(String header) {
        return header == null ? "" : header.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
    }

    private boolean isRowEmpty(Row row) {
        if (row == null) return true;
        for (Cell cell : row) {
            if (cell != null && cell.getCellType() != CellType.BLANK) {
                return false;
            }
        }
        return true;
    }

    private String formatCellValue(Cell cell) {
        return formatCellValue(cell, new DataFormatter());
    }

    private String formatCellValue(Cell cell, DataFormatter formatter) {
        if (cell == null) return null;
        String value = formatter.formatCellValue(cell);
        return value == null ? null : value.trim();
    }

    private Double parseNumericValue(Cell cell) {
        if (cell == null) return null;
        return switch (cell.getCellType()) {
            case NUMERIC -> cell.getNumericCellValue();
            case STRING -> {
                try {
                    yield Double.parseDouble(cell.getStringCellValue().trim());
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
