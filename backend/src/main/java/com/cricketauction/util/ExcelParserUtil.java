package com.cricketauction.util;

import com.cricketauction.entity.Player;
import com.cricketauction.entity.Tournament;
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

    public ExcelParserUtil(GoogleDriveUtil googleDriveUtil) {
        this.googleDriveUtil = googleDriveUtil;
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

                if (name == null || name.isBlank()) continue;

                Player.PlayerRole role;
                try {
                    role = Player.PlayerRole.valueOf(roleStr.toUpperCase().replace(" ", "_").replace("-", "_"));
                } catch (Exception e) {
                    role = Player.PlayerRole.BATSMAN;
                }

                if (basePrice == null || basePrice <= 0) basePrice = 1000.0;

                String convertedImageUrl = googleDriveUtil.convertToDirectLink(imageUrl);

                Player player = Player.builder()
                        .name(name.trim())
                        .role(role)
                        .basePrice(basePrice)
                        .currentBid(0.0)
                        .imageUrl(convertedImageUrl)
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
}
