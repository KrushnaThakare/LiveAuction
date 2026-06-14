package com.cricketauction.service;

import com.cricketauction.dto.PlayerResponse;
import com.cricketauction.dto.RegistrationResponse;
import com.cricketauction.entity.Player;
import com.cricketauction.entity.PlayerRegistration;
import com.cricketauction.entity.Tournament;
import com.cricketauction.exception.AuctionException;
import com.cricketauction.exception.ResourceNotFoundException;
import com.cricketauction.repository.PlayerRegistrationRepository;
import com.cricketauction.repository.PlayerRepository;
import com.cricketauction.repository.FormFieldRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Service
@Transactional
public class PlayerRegistrationService {

    @Value("${app.public-base-url:}")
    private String publicBaseUrl;

    private static final Logger log = LoggerFactory.getLogger(PlayerRegistrationService.class);

    private final PlayerRegistrationRepository regRepo;
    private final PlayerRepository playerRepo;
    private final TournamentService tournamentService;
    private final FileStorageService fileStorage;
    private final RegistrationSheetSyncService sheetSyncService;
    private final FormFieldRepository formFieldRepository;
    private final PlayerRoleService playerRoleService;

    public PlayerRegistrationService(PlayerRegistrationRepository regRepo,
                                     PlayerRepository playerRepo,
                                     TournamentService tournamentService,
                                     FileStorageService fileStorage,
                                     RegistrationSheetSyncService sheetSyncService,
                                     FormFieldRepository formFieldRepository,
                                     PlayerRoleService playerRoleService) {
        this.regRepo = regRepo;
        this.playerRepo = playerRepo;
        this.tournamentService = tournamentService;
        this.fileStorage = fileStorage;
        this.sheetSyncService = sheetSyncService;
        this.formFieldRepository = formFieldRepository;
        this.playerRoleService = playerRoleService;
    }

    public RegistrationResponse submit(Long tournamentId, String formData,
                                       String playerName, String mobile,
                                       MultipartFile photo,
                                       java.util.Map<String, MultipartFile> fileMap) {
        Tournament t = tournamentService.findById(tournamentId);
        if (!Boolean.TRUE.equals(t.getRegistrationEnabled())) {
            throw new AuctionException("Registration is not open for this tournament");
        }
        if (mobile != null && !mobile.isBlank()
                && regRepo.existsByTournamentIdAndMobile(tournamentId, mobile)) {
            throw new AuctionException("A registration with this mobile number already exists");
        }

        String photoUrl = null;
        if (photo != null && !photo.isEmpty()) {
            try {
                photoUrl = fileStorage.savePlayerPhoto(tournamentId, photo);
            } catch (Exception e) {
                log.warn("Photo upload failed: {}", e.getMessage());
            }
        }



        // Store any additional FILE_UPLOAD fields and write back public URLs into formData map
        String mergedFormData = formData;
        try {
            ObjectMapper om = new ObjectMapper();
            java.util.Map<String, Object> data = om.readValue(
                    formData == null ? "{}" : formData,
                    new TypeReference<java.util.LinkedHashMap<String, Object>>() {}
            );
            if (fileMap != null) {
                for (var entry : fileMap.entrySet()) {
                    String param = entry.getKey();
                    MultipartFile f = entry.getValue();
                    if (f == null || f.isEmpty()) continue;
                    if (!param.startsWith("file_")) continue;
                    String fieldKey = param.substring("file_".length());
                    try {
                        String docUrl = fileStorage.savePlayerPhoto(tournamentId, f);
                        data.put(fieldKey, docUrl);
                    } catch (Exception e) {
                        log.warn("Upload failed for field {}: {}", fieldKey, e.getMessage());
                    }
                }
            }
            mergedFormData = om.writeValueAsString(data);
        } catch (Exception e) {
            log.warn("Could not merge uploaded document URLs into formData: {}", e.getMessage());
        }


        PlayerRegistration reg = PlayerRegistration.builder()
                .tournament(t).formData(mergedFormData)
                .playerName(playerName).mobile(mobile)
                .photoUrl(photoUrl)
                .status(PlayerRegistration.RegistrationStatus.PENDING)
                .build();

        PlayerRegistration saved = regRepo.save(reg);
        sheetSyncService.push("updated", saved);
        return mapToResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<RegistrationResponse> getAll(Long tournamentId) {
        return regRepo.findByTournamentIdOrderBySubmittedAtDesc(tournamentId)
                .stream().map(this::mapToResponse).toList();
    }

    @Transactional(readOnly = true)
    public RegistrationResponse getById(Long id) {
        return mapToResponse(regRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Registration", id)));
    }

    /** Edit a registration's details and optionally replace the photo */
    public RegistrationResponse editRegistration(Long registrationId, String formData,
                                                  String playerName, String mobile,
                                                  MultipartFile photo) {
        PlayerRegistration reg = regRepo.findById(registrationId)
                .orElseThrow(() -> new ResourceNotFoundException("Registration", registrationId));

        if (formData   != null) reg.setFormData(formData);
        if (playerName != null) reg.setPlayerName(playerName);
        if (mobile     != null) reg.setMobile(mobile);

        if (photo != null && !photo.isEmpty()) {
            if (reg.getPhotoUrl() != null) fileStorage.deleteFile(reg.getPhotoUrl());
            try {
                reg.setPhotoUrl(fileStorage.savePlayerPhoto(reg.getTournament().getId(), photo));
            } catch (Exception e) {
                log.warn("Photo update failed: {}", e.getMessage());
            }
        }

        PlayerRegistration saved = regRepo.save(reg);
        sheetSyncService.push("submitted", saved);
        return mapToResponse(saved);
    }

    /** Import a single registration as an auction player. */
    public PlayerResponse importToAuction(Long registrationId, String roleOverride, Double basePrice) {
        PlayerRegistration reg = regRepo.findById(registrationId)
                .orElseThrow(() -> new ResourceNotFoundException("Registration", registrationId));

        String roleStr = roleOverride;
        if ((roleStr == null || roleStr.isBlank()) && reg.getFormData() != null) {
            try {
                com.fasterxml.jackson.databind.ObjectMapper om = new com.fasterxml.jackson.databind.ObjectMapper();
                java.util.Map<?, ?> data = om.readValue(reg.getFormData(), java.util.Map.class);
                roleStr = formFieldRepository.findByTournamentIdOrderByPositionAsc(reg.getTournament().getId())
                        .stream()
                        .filter(field -> "role".equalsIgnoreCase(field.getMapsToPlayerField()))
                        .map(field -> data.get(field.getFieldKey()))
                        .filter(String.class::isInstance)
                        .map(String.class::cast)
                        .findFirst()
                        .orElse(null);
            } catch (Exception ignored) {}
        }

        String playerRole = playerRoleService.resolveRole(reg.getTournament(), roleStr);

        Player player = Player.builder()
                .name(reg.getPlayerName() != null ? reg.getPlayerName() : "Unknown")
                .role(playerRole)
                .basePrice(basePrice != null && basePrice > 0 ? basePrice : 1000.0)
                .currentBid(0.0)
                .imageUrl(reg.getPhotoUrl())
                .status(Player.PlayerStatus.AVAILABLE)
                .tournament(reg.getTournament())
                .build();

        player = playerRepo.save(player);
        reg.setStatus(PlayerRegistration.RegistrationStatus.IMPORTED);
        reg.setImportedPlayerId(player.getId());
        regRepo.save(reg);

        return mapPlayer(player);
    }

    /** Bulk import all PENDING registrations */
    public int bulkImport(Long tournamentId, Double defaultBasePrice) {
        List<PlayerRegistration> pending = regRepo
                .findByTournamentIdOrderBySubmittedAtDesc(tournamentId)
                .stream()
                .filter(r -> r.getStatus() == PlayerRegistration.RegistrationStatus.PENDING)
                .toList();

        int count = 0;
        for (PlayerRegistration reg : pending) {
            try {
                importToAuction(reg.getId(), null, defaultBasePrice);
                count++;
            } catch (Exception e) {
                log.warn("Failed to import registration {}: {}", reg.getId(), e.getMessage());
            }
        }
        return count;
    }



    @Transactional(readOnly = true)
    public byte[] exportRegistrationsExcel(Long tournamentId) {
        List<PlayerRegistration> rows = regRepo.findByTournamentIdOrderBySubmittedAtDesc(tournamentId);
        ObjectMapper om = new ObjectMapper();

        java.util.LinkedHashSet<String> dynamicKeys = new java.util.LinkedHashSet<>();
        java.util.Map<Long, java.util.Map<String, Object>> parsed = new java.util.HashMap<>();

        for (PlayerRegistration reg : rows) {
            try {
                java.util.Map<String, Object> map = om.readValue(
                        reg.getFormData() == null ? "{}" : reg.getFormData(),
                        new TypeReference<java.util.LinkedHashMap<String, Object>>() {}
                );
                parsed.put(reg.getId(), map);
                dynamicKeys.addAll(map.keySet());
            } catch (Exception ignored) {
                parsed.put(reg.getId(), java.util.Map.of());
            }
        }

        try (Workbook wb = new XSSFWorkbook(); java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream()) {
            Sheet sh = wb.createSheet("Registrations");
            Row h = sh.createRow(0);

            java.util.List<String> baseCols = java.util.List.of(
                    "ID", "Player Name", "Mobile", "Status", "Submitted At", "Photo URL"
            );

            int c = 0;
            for (String col : baseCols) h.createCell(c++).setCellValue(col);
            java.util.List<String> orderedDynamic = new java.util.ArrayList<>(dynamicKeys);
            for (String key : orderedDynamic) h.createCell(c++).setCellValue(key);

            int r = 1;
            for (PlayerRegistration reg : rows) {
                Row row = sh.createRow(r++);
                int i = 0;
                row.createCell(i++).setCellValue(reg.getId() != null ? reg.getId() : 0);
                row.createCell(i++).setCellValue(reg.getPlayerName() != null ? reg.getPlayerName() : "");
                row.createCell(i++).setCellValue(reg.getMobile() != null ? reg.getMobile() : "");
                row.createCell(i++).setCellValue(reg.getStatus() != null ? reg.getStatus().name() : "");
                row.createCell(i++).setCellValue(reg.getSubmittedAt() != null ? reg.getSubmittedAt().toString() : "");
                row.createCell(i++).setCellValue(toPublicUrl(reg.getPhotoUrl()));

                java.util.Map<String, Object> map = parsed.getOrDefault(reg.getId(), java.util.Map.of());
                for (String key : orderedDynamic) {
                    Object v = map.get(key);
                    row.createCell(i++).setCellValue(normalizeExportValue(v));
                }
            }

            for (int i = 0; i < baseCols.size() + orderedDynamic.size(); i++) sh.autoSizeColumn(i);
            wb.write(out);
            return out.toByteArray();
        } catch (Exception e) {
            throw new AuctionException("Failed to export registrations");
        }
    }

    public void deleteRegistration(Long id) {
        PlayerRegistration reg = regRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Registration", id));
        if (reg.getPhotoUrl() != null) fileStorage.deleteFile(reg.getPhotoUrl());
        sheetSyncService.push("deleted", reg);
        regRepo.delete(reg);
    }

    private String toPublicUrl(String raw) {
        if (raw == null || raw.isBlank()) return "";
        if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
        String base = publicBaseUrl == null ? "" : publicBaseUrl.trim();
        if (base.endsWith("/")) base = base.substring(0, base.length() - 1);
        if (raw.startsWith("/")) return base + raw;
        return base + "/" + raw;
    }



    private String normalizeExportValue(Object rawValue) {
        if (rawValue == null) return "";
        if (rawValue instanceof java.util.List<?> list) {
            return list.stream().map(this::normalizeExportValue).filter(v -> v != null && !v.isBlank())
                    .collect(java.util.stream.Collectors.joining(", "));
        }
        if (rawValue instanceof java.util.Map<?, ?> map) {
            Object url = map.get("url");
            if (url == null) url = map.get("secure_url");
            if (url == null) url = map.get("fileUrl");
            if (url != null) return normalizeExportValue(url);
            return map.toString();
        }

        String s = String.valueOf(rawValue).trim();
        if (s.isEmpty()) return "";

        // Normalize common uploaded-file path styles to public URLs in export
        if (s.startsWith("/api/uploads/") || s.startsWith("/api/images/")) return toPublicUrl(s);
        if (s.startsWith("/uploads/")) return toPublicUrl("/api" + s);
        if (s.startsWith("/images/"))  return toPublicUrl("/api" + s);
        return s;
    }

    private RegistrationResponse mapToResponse(PlayerRegistration r) {
        return RegistrationResponse.builder()
                .id(r.getId()).tournamentId(r.getTournament().getId())
                .playerName(r.getPlayerName()).mobile(r.getMobile())
                .photoUrl(r.getPhotoUrl()).formData(r.getFormData())
                .status(r.getStatus()).importedPlayerId(r.getImportedPlayerId())
                .submittedAt(r.getSubmittedAt())
                .build();
    }

    private PlayerResponse mapPlayer(Player p) {
        return PlayerResponse.builder()
                .id(p.getId()).name(p.getName()).role(p.getRole())
                .basePrice(p.getBasePrice()).currentBid(p.getCurrentBid())
                .imageUrl(p.getImageUrl()).status(p.getStatus())
                .tournamentId(p.getTournament().getId())
                .build();
    }
}
